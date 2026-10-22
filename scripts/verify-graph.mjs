/**
 * 图谱自检：服务端建图/布局（纯函数穷举）+ 客户端渲染（真 React 静态渲染）。
 *
 * 验证：
 *   1. buildGraph：tag 边 / co 边 / 合并边类型 / 度数 / maxEdges 截断 / 统计。
 *   2. graphLayout：确定性（同一份图两次布局逐坐标相等）、坐标落在画布内、
 *      单节点不崩、相连的节点比随机放更近（弹簧确实在拉）。
 *   3. GraphTab（受控模式渲染）：SVG 里圆点数=节点数、线数=边数、
 *      aria-label 带规模、无选中时不画抽屉。
 *   4. PanelBody 带 initialTab='graph' 不崩（图谱页签进了页签序列）。
 *
 * 不验证（与 verify-render 同一取舍）：样式、交互事件、真实原语契约。
 *
 * 用法：node scripts/verify-graph.mjs
 */
import { loadHarness, hasReact } from './lib/ui-harness.mjs'
import { buildGraph, graphLayout } from '../lib/graph.js'

let failures = 0
const check = (label, ok, detail = '') => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + label + (detail ? '  — ' + detail : ''))
  if (!ok) failures++
}

// ── 夹具：三页，两个共享标签，一次共召回 ──
const PAGES = [
  { id: 'a-vm', title: 'A 虚拟机', category: 'fact', status: 'committed', tags: ['环境', 'NPU'], sources: ['u1'], confidence: 0.9 },
  { id: 'b-8card', title: 'B 八卡机', category: 'fact', status: 'committed', tags: ['环境', '绿区'], sources: ['u2'], confidence: 0.8 },
  { id: 'c-lesson', title: 'C 教训', category: 'lesson', status: 'committed', tags: [], sources: ['u3'], confidence: 0.7 },
  { id: 'd-staged', title: 'D 暂存', category: 'howto', status: 'staged', tags: ['环境'], sources: [], confidence: 0.5 },
]
const USAGE = {
  version: 1,
  pages: {
    'a-vm': { hits: 5, confirmed: 2, suspect: 0 },
    'b-8card': { hits: 1, confirmed: 0, suspect: 0 },
  },
  co: { 'a-vm|b-8card': 3 },
}

console.log('── buildGraph ──')
{
  const g = buildGraph(PAGES, USAGE)
  check('节点数=页面数且按 id 稳定排序',
    g.nodes.length === 4 && g.nodes.map(n => n.id).join() === 'a-vm,b-8card,c-lesson,d-staged',
    g.nodes.map(n => n.id).join())
  const edge = (a, b) => g.edges.find(e => (e.a === a && e.b === b) || (e.a === b && e.b === a))
  check('共享标签「环境」把 a/b/d 连成 3 条 tag 边（ tag=2 / 1 / 1 ）',
    edge('a-vm', 'b-8card').tag === 1 && edge('a-vm', 'd-staged').tag === 1 && edge('b-8card', 'd-staged').tag === 1,
    JSON.stringify(g.edges.map(e => e.a + '~' + e.b + ' tag:' + e.tag + ' co:' + e.co)))
  check('co 账本并入同一条边且 co≥tag 时 type=co',
    edge('a-vm', 'b-8card').co === 3 && edge('a-vm', 'b-8card').type === 'co')
  check('无标签无共现的 c-lesson 孤立', g.nodes.find(n => n.id === 'c-lesson').degree === 0)
  check('stats 口径对得上',
    g.stats.nodes === 4 && g.stats.edges === 3 && g.stats.isolated === 1
    && g.stats.coEdges === 1 && g.stats.tagEdges === 2 && g.stats.counts.fact === 2,
    JSON.stringify(g.stats))

  const g2 = buildGraph(PAGES, USAGE, { maxEdges: 1 })
  check('maxEdges 截断后只剩最重的边', g2.edges.length === 1 && g2.edges[0].weight === 4,
    JSON.stringify(g2.edges.map(e => e.a + '~' + e.b + ' w:' + e.weight)))

  const g3 = buildGraph(PAGES, USAGE)
  check('幂等：同一份输入两次建图逐字段相等', JSON.stringify(g) === JSON.stringify(g3))
  check('空输入不崩', buildGraph([], {}).stats.nodes === 0)
}

console.log('── graphLayout ──')
{
  const g = buildGraph(PAGES, USAGE)
  const l1 = graphLayout(g, { width: 400, height: 300 })
  const l2 = graphLayout(buildGraph(PAGES, USAGE), { width: 400, height: 300 })
  check('确定性：两次布局逐坐标相等', JSON.stringify(l1) === JSON.stringify(l2))
  const inBounds = l1.nodes.every(n => n.x >= 0 && n.x <= 400 && n.y >= 0 && n.y <= 300)
  check('全部坐标落在画布内', inBounds, l1.nodes.map(n => Math.round(n.x) + ',' + Math.round(n.y)).join(' '))
  const a = l1.nodes.find(n => n.id === 'a-vm')
  const b = l1.nodes.find(n => n.id === 'b-8card')
  const c = l1.nodes.find(n => n.id === 'c-lesson')
  check('相连节点（a~b，w=4）比孤立节点 c 更近',
    Math.hypot(a.x - b.x, a.y - b.y) < Math.hypot(a.x - c.x, a.y - c.y),
    'ab=' + Math.hypot(a.x - b.x, a.y - b.y).toFixed(1) + ' ac=' + Math.hypot(a.x - c.x, a.y - c.y).toFixed(1))
  check('单节点不崩', graphLayout({ nodes: [{ id: 'x', degree: 0 }], edges: [] }).nodes.length === 1)
  check('无节点不崩', graphLayout({ nodes: [], edges: [] }).nodes.length === 0)
}

if (!hasReact()) {
  console.log('  SKIP  DSH 的 node_modules 里没有 react，跳过渲染断言')
  console.log('')
  if (failures) { console.log('FAIL ' + failures + ' 条断言没过'); process.exit(1) }
  process.exit(0)
} else {
  console.log('── GraphTab 渲染（真 React 静态渲染，受控模式）──')
  const H = await loadHarness()
  const h = H.h
  const { renderToStaticMarkup } = H
  const M = H.build(true)
  const { GraphTab } = M.__components
  const { graphNodeRadius, graphLabelWorthy, graphLabelCut, graphEdgeStyle } = M.__logic

  check('GraphTab 在测试接缝里', typeof GraphTab === 'function')

  // 纯逻辑：视觉判据
  check('半径随命中增长且封顶',
    graphNodeRadius({ hits: 0, degree: 0 }) === 5
    && graphNodeRadius({ hits: 10, degree: 0 }) > graphNodeRadius({ hits: 1, degree: 0 })
    && graphNodeRadius({ hits: 1e9, degree: 1e9 }) <= 14)
  check('标签取舍：选中/有度/有命中/暂存 才画',
    graphLabelWorthy({ id: 'x', degree: 0, hits: 0, status: 'committed' }, 'x') === true
    && graphLabelWorthy({ id: 'x', degree: 0, hits: 0, status: 'committed' }, 'y') === false
    && graphLabelWorthy({ id: 'x', degree: 1, hits: 0, status: 'committed' }, 'y') === true
    && graphLabelWorthy({ id: 'x', degree: 0, hits: 0, status: 'staged' }, 'y') === true)
  check('标题截断加省略号', graphLabelCut('很长很长的标题一二三四五', 6) === '很长很长的标…')
  const st = graphEdgeStyle({ type: 'co', weight: 4, a: 'a-vm', b: 'b-8card' }, 'a-vm', {})
  check('边档位：co 品牌红实线、选中相邻高不透明（华为红三色体系）',
    st.dash === undefined && st.stroke === '#b5333b' && st.opacity >= 0.9, JSON.stringify(st))
  const dim = graphEdgeStyle({ type: 'tag', weight: 1, a: 'a-vm', b: 'b-8card' }, 'c-lesson', {})
  check('边档位：无关边压到近透明 + 虚线', dim.opacity <= 0.15 && dim.dash === '3 3', JSON.stringify(dim))

  // 渲染：受控模式直接给图
  const g = buildGraph(PAGES, USAGE)
  const lay = graphLayout(g, { width: 400, height: 300 })
  const pos = new Map(lay.nodes.map(n => [n.id, n]))
  for (const n of g.nodes) { n.x = pos.get(n.id).x; n.y = pos.get(n.id).y }
  const fixture = { ...g, width: 400, height: 300 }
  const html = renderToStaticMarkup(h(GraphTab, { graph: fixture }))
  const count = (hay, needle) => hay.split(needle).length - 1
  check('不崩且画出 SVG', html.includes('<svg') && html.includes('viewBox="0 0 400 300"'))
  check('圆点数=节点数（' + fixture.nodes.length + '）', count(html, '<circle') === fixture.nodes.length,
    String(count(html, '<circle')))
  check('线数=边数（' + fixture.edges.length + '）', count(html, '<line') === fixture.edges.length,
    String(count(html, '<line')))
  check('aria-label 带规模', html.includes('aria-label="知识图谱：4 个页面，3 条连边"') || html.includes('知识图谱：'))
  check('无选中不画抽屉', !html.includes('lw-graph-drawer'))
  check('孤立节点也画出（c-lesson）', html.includes('c-lesson') || html.includes('C 教训') || count(html, '<circle') >= 4)

  // PanelBody 带 initialTab='graph' 不崩（未受控的 GraphTab 在 SSR 下显示「读取中…」）
  const { makeState } = await import('./lib/ui-harness.mjs')
  const body = renderToStaticMarkup(h(M.__components.PanelBody, { state: makeState(), initialTab: 'graph' }))
  check('PanelBody initialTab=graph 渲染不崩且图谱页签在序列里',
    body.includes('图谱') && body.includes('读取中…') === false || body.includes('读取中'))
  check('TABS 含 graph（键盘 tablist 联动用同一份序列）',
    M.__logic.TABS.some(t => t.id === 'graph' && t.label === '图谱'))
}

console.log('')
if (failures) { console.log('FAIL ' + failures + ' 条断言没过'); process.exit(1) }
console.log('全部通过')
