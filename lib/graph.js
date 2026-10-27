// 知识图谱：把 pages + usage 账本变成「节点 + 边」的纯函数。
//
// 设计约束（与 lib/wiki.js 同源）：
//   1. 纯函数、零 IO——布局与建图都能被离线穷举断言，不依赖真实仓库。
//   2. 边的来源只有两种**可解释**的信号：
//        tag —— 两页共享标签（「这页讲环境、那页也讲环境」）
//        co  —— 同一次召回里被一起命中（「这两个知识总是一起被需要」）
//      不做语义 embedding 边：那会把「为什么连着」变成黑盒，而这张图
//      的用途恰恰是让人看懂结构。
//   3. 幂等：同一份输入永远得到同一份输出（边排序稳定、节点按 id 稳定），
//      这样 UI 轮询刷新时图不会闪跳。
import { classify, shouldQuarantine, DEFAULT_POLICY } from './usage.js'

/**
 * 去掉节点标题的**共同前缀**，返回等长的显示标签数组（与输入一一对应）。
 *
 * 为什么：图谱节点的标签画在节点旁边，一批「950 xxx」「Atlas 950 xxx」
 * 「HowTo：xxx」摆在一起，前缀占了标签的一大半，真正区分彼此的部分反而
 * 被截断号吃掉。这里多轮贪心：每轮找「被 ≥2 个标题以开头、且剥掉后仍非空」的
 * **最长**前缀剥掉，直到找不到为止。纯函数、确定性，同样的输入永远同样的输出。
 *
 * 注意只动**显示标签**，title/id 永远保持原样——详情页、tooltip、检索不受影响。
 */
export function stripCommonPrefixes(titles) {
  const labels = (Array.isArray(titles) ? titles : []).map(t => String(t ?? ''))
  const MAX_ROUNDS = 6 // 防御性上限：正常语料两三轮就剥干净了
  for (let round = 0; round < MAX_ROUNDS; round++) {
    // 收集所有候选前缀（长度 ≥2）→ 以它开头的标题集合
    const seen = new Map()
    for (const l of labels) {
      for (let len = 2; len <= l.length; len++) {
        const p = l.slice(0, len)
        const arr = seen.get(p)
        if (arr) arr.push(l)
        else seen.set(p, [l])
      }
    }
    // 最长的可用前缀胜出：「≥2 个不同标题」以它开头，且剥掉后不产生空标签
    let best = ''
    let holders = null
    for (const [p, arr] of seen) {
      if (p.length <= best.length) continue
      const uniq = new Set(arr.filter(l => l.length > p.length))
      if (uniq.size >= 2) { best = p; holders = uniq }
    }
    if (!best) break
    for (const l of holders) labels[labels.indexOf(l)] = l.slice(best.length).replace(/^[ \u3000]+/, '')
  }
  return labels
}

/**
 * 建图。
 *
 * @param {Array}  pages  loadPages() 的产物（含 status/tags/confidence 等）
 * @param {Object} usage  loadUsage() 的产物（pages 账本 + co 共现账本）
 * @param {Object} opts   { maxEdges=300, minCo=1 }  边上限与共现门槛
 */
export function buildGraph(pages, usage, opts = {}) {
  const maxEdges = Number.isFinite(opts.maxEdges) ? opts.maxEdges : 300
  const minCo = Number.isFinite(opts.minCo) ? opts.minCo : 1
  const list = Array.isArray(pages) ? pages : []
  const byId = new Map(list.map(p => [p.id, p]))
  const st = usage && typeof usage === 'object' ? (usage.pages ?? {}) : {}
  const co = usage && typeof usage === 'object' ? (usage.co ?? {}) : {}
  const policy = { ...DEFAULT_POLICY, ...(usage?.policy ?? {}) }
  const now = Date.now()

  // ── 节点：committed 与 staged 都进图，staged 用虚线圈区分 ──
  const nodes = list.map(p => {
    const s = st[p.id]
    return {
      id: p.id,
      title: p.title || p.id,
      category: p.category || 'fact',
      status: p.status || 'committed',
      cls: classify(s, p, { now, policy }),
      hits: s?.hits ?? 0,
      confirmed: s?.confirmed ?? 0,
      suspect: s?.suspect ?? 0,
      quarantined: shouldQuarantine(s, policy),
      tags: Array.isArray(p.tags) ? p.tags : [],
      sources: (p.sources ?? []).length,
      degree: 0,
    }
  })
  nodes.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

  // ── 显示标签：剥掉标题间的共同前缀（「Atlas 950 xxx」「HowTo：xxx」这类），
  //    否则图谱上一排标签长得一样，截断后更分不清谁是谁。title 保持原样。
  const labels = stripCommonPrefixes(nodes.map(n => n.title))
  for (let i = 0; i < nodes.length; i++) nodes[i].label = labels[i] || nodes[i].title

  // ── tag 边：共享标签数作权重 ──
  const pair = new Map()
  const key = (a, b) => (a < b ? a + '|' + b : b + '|' + a)
  const bump = (a, b, field, n) => {
    if (a === b) return
    const k = key(a, b)
    const e = pair.get(k) ?? { a: a < b ? a : b, b: a < b ? b : a, tag: 0, co: 0 }
    e[field] += n
    pair.set(k, e)
  }
  const byTag = new Map()
  for (const n of nodes) {
    for (const t of n.tags) {
      if (!t) continue
      const arr = byTag.get(t) ?? []
      arr.push(n.id)
      byTag.set(t, arr)
    }
  }
  for (const ids of byTag.values()) {
    // 同一标签下两两成边。标签下的页面通常很少（个位数），
    // O(k²) 可接受；真出现巨型标签也会被 maxEdges 截断。
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) bump(ids[i], ids[j], 'tag', 1)
    }
  }

  // ── co 边：usage.co 里存的是 "a|b" -> 共现次数（recordHit 顺手记）──
  for (const [k, n] of Object.entries(co)) {
    const i = k.indexOf('|')
    if (i <= 0) continue
    const a = k.slice(0, i), b = k.slice(i + 1)
    if (!byId.has(a) || !byId.has(b)) continue
    const c = Number(n) || 0
    if (c >= minCo) bump(a, b, 'co', c)
  }

  // ── 收边：一页一条、type 取主信号，按权重稳定排序后截断 ──
  let edges = [...pair.values()]
    .filter(e => e.tag > 0 || e.co > 0)
    .map(e => ({
      a: e.a, b: e.b,
      type: e.co > 0 && e.co >= e.tag ? 'co' : 'tag',
      tag: e.tag, co: e.co,
      weight: e.tag + e.co,
    }))
  edges.sort((x, y) =>
    y.weight - x.weight ||
    (x.a < y.a ? -1 : x.a > y.a ? 1 : 0) ||
    (x.b < y.b ? -1 : 1),
  )
  if (edges.length > maxEdges) edges = edges.slice(0, maxEdges)

  const deg = new Map()
  for (const e of edges) {
    deg.set(e.a, (deg.get(e.a) ?? 0) + 1)
    deg.set(e.b, (deg.get(e.b) ?? 0) + 1)
  }
  for (const n of nodes) n.degree = deg.get(n.id) ?? 0

  const counts = {}
  for (const n of nodes) counts[n.category] = (counts[n.category] ?? 0) + 1
  return {
    nodes,
    edges,
    stats: {
      nodes: nodes.length,
      edges: edges.length,
      isolated: nodes.filter(n => n.degree === 0).length,
      coEdges: edges.filter(e => e.type === 'co').length,
      tagEdges: edges.filter(e => e.type === 'tag').length,
      counts,
    },
  }
}

/**
 * 确定性布局：圆形初始化 + 固定迭代数的力导向。
 *
 * 刻意**不用 Math.random**：种子是节点在数组里的序号。同一份图永远
 * 得到同一份坐标——离线渲染（verify:render / ui:snapshot）不跑
 * useEffect，靠 useMemo 里的这份函数就能画出与浏览器一致的图。
 *
 * 迭代数压在 200：≤ 几百节点时 O(n²+e·k) 在毫秒级，不值得上 rAF。
 */
export function graphLayout(graph, opts = {}) {
  const width = opts.width ?? 960
  const height = opts.height ?? 520
  const iterations = opts.iterations ?? 200
  const nodes = (graph?.nodes ?? []).map((n, i) => ({
    id: n.id, degree: n.degree ?? 0, hits: n.hits ?? 0,
    x: width / 2 + Math.cos((2 * Math.PI * i) / Math.max(1, graph.nodes.length)) * (Math.min(width, height) / 3),
    y: height / 2 + Math.sin((2 * Math.PI * i) / Math.max(1, graph.nodes.length)) * (Math.min(width, height) / 3),
  }))
  const idx = new Map(nodes.map((n, i) => [n.id, i]))
  const edges = (graph?.edges ?? [])
    .map(e => ({ s: idx.get(e.a), t: idx.get(e.b), weight: e.weight ?? 1 }))
    .filter(e => e.s !== undefined && e.t !== undefined && e.s !== e.t)
  if (nodes.length <= 1) return { nodes, width, height }

  const k = Math.sqrt((width * height) / Math.max(1, nodes.length)) // 理想间距
  const repulse = k * k * 0.6
  const spring = 0.02
  const gravity = 0.05

  for (let it = 0; it < iterations; it++) {
    const fx = new Array(nodes.length).fill(0)
    const fy = new Array(nodes.length).fill(0)
    // 斥力（库仑）
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y
        let d2 = dx * dx + dy * dy
        if (d2 < 1) { dx = ((i * 7 + j * 13) % 11) - 5 || 1; dy = ((i * 5 + j * 3) % 11) - 5 || 1; d2 = dx * dx + dy * dy }
        const f = repulse / d2
        const d = Math.sqrt(d2)
        const ux = dx / d, uy = dy / d
        fx[i] += ux * f; fy[i] += uy * f
        fx[j] -= ux * f; fy[j] -= uy * f
      }
    }
    // 引力（胡克）：边越重越短
    for (const e of edges) {
      const dx = nodes[e.t].x - nodes[e.s].x, dy = nodes[e.t].y - nodes[e.s].y
      const d = Math.max(1, Math.sqrt(dx * dx + dy * dy))
      const rest = k / (1 + Math.log1p(e.weight))
      const f = spring * (d - rest)
      const ux = (dx / d) * f, uy = (dy / d) * f
      fx[e.s] += ux; fy[e.s] += uy
      fx[e.t] -= ux; fy[e.t] -= uy
    }
    // 向心 + 限步长（早期迭代大步、后期收敛）
    const damp = it < iterations * 0.5 ? 0.9 : 0.3
    for (let i = 0; i < nodes.length; i++) {
      fx[i] += (width / 2 - nodes[i].x) * gravity
      fy[i] += (height / 2 - nodes[i].y) * gravity
      const step = Math.hypot(fx[i], fy[i])
      const cap = k * damp
      if (step > cap) { fx[i] = (fx[i] / step) * cap; fy[i] = (fy[i] / step) * cap }
      nodes[i].x += fx[i]
      nodes[i].y += fy[i]
    }
  }

  // 归一化到画布内（留 padding，别让节点贴边被裁一半）
  const pad = 26
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const n of nodes) {
    minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x)
    minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y)
  }
  const sx = (width - pad * 2) / Math.max(1e-6, maxX - minX)
  const sy = (height - pad * 2) / Math.max(1e-6, maxY - minY)
  const s = Math.min(1, sx, sy)
  for (const n of nodes) {
    n.x = pad + (n.x - minX) * s + ((width - pad * 2) - (maxX - minX) * s) / 2
    n.y = pad + (n.y - minY) * s + ((height - pad * 2) - (maxY - minY) * s) / 2
  }
  return { nodes, width, height }
}
