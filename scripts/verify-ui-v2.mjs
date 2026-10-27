/**
 * 二级界面 v2 自检：tree / vendor / srcs（溯源）/ graph 的**真实 handler** 测试。
 *
 * 与 verify-ui-api 的分工：那条脚本跑真实 wiki、覆盖全部存量路由；
 * 本脚本用一次性夹具 wiki（含 session:// 与 URL 双来源的页面），
 * 专测 v2 新增的三块——目录树、vendor 静态路由（含越界守卫）、
 * /api/state 的 srcs 溯源字段，以及对应客户端渲染（目录树/来源列）。
 *
 * 用法：node scripts/verify-ui-v2.mjs
 */
import { rm, mkdtemp, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let failures = 0
const check = (label, ok, detail = '') => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + label + (detail ? '  — ' + detail : ''))
  if (!ok) failures++
}

// ── 夹具 wiki：1 条带 session+URL 双来源的已固化页 + 1 条暂存 ──
const ROOT = await mkdtemp(join(tmpdir(), 'aico-wiki-v2-'))
await mkdir(join(ROOT, 'pages', 'fact'), { recursive: true })
await mkdir(join(ROOT, 'staged'), { recursive: true })
await writeFile(join(ROOT, 'pages', 'fact', 'env-vm.md'), [
  '---',
  'id: env-vm',
  'title: B12 四 910B3 虚拟机',
  'category: fact',
  'status: committed',
  'confidence: 0.9',
  'sources:',
  '  - session://ea879c25',
  '  - https://github.com/x/y/blob/main/env.md',
  '  - D:/docs/机器规格.md',
  'tags:',
  '  - 环境',
  'created: 2026-10-22',
  '---',
  '',
  '正文一行。',
  '',
].join('\n'), 'utf8')
await writeFile(join(ROOT, 'staged', 'note-abc.md'), [
  '---',
  'id: note-abc',
  'title: 暂存页',
  'category: lesson',
  'status: staged',
  'confidence: 0.5',
  'sources:',
  '  - session://ff0011',
  'tags: []',
  '---',
  '',
  '正文。',
  '',
].join('\n'), 'utf8')

let route = null
const ctxLike = {
  tools: { register: () => () => {}, schemas: () => [] },
  llm: { listProviders: () => [], listModels: async () => [], stream: async function* () {} },
  web: { search: async () => ({ sources: [] }) },
  webServer: { register: (r) => { route = r; return () => {} } },
  on: () => () => {},
  effect: (fn) => fn(),
  inject: (s, cb) => cb({ systemPrompt: { section: () => {} } }),
}
const mod = await import('../index.js')
try { mod.apply(ctxLike, { wikiRoot: ROOT }) } catch (e) {
  console.log('FAIL apply 抛异常：' + e.message)
  process.exit(1)
}

function call(pathname, method = 'GET') {
  return new Promise((resolve) => {
    let code = 0, body = ''
    const res = {
      writeHead: (c) => { code = c },
      end: (b) => { body = b; resolve({ code, body }) },
    }
    route.handler({ url: pathname, method }, res)
  })
}
const J = async (r) => { try { return JSON.parse(r.body) } catch { return null } }

console.log('── /api/tree ──')
{
  const r = await J(await call('/aico-llm-wiki/api/tree'))
  check('返回 200 且 ok', r && r.ok === true)
  const leaf = r?.tree?.pages?.fact?.['env-vm.md']
  check('目录树含 pages/fact/env-vm.md 叶子（带 id/title）',
    leaf && leaf.__leaf === true && leaf.id === 'env-vm' && leaf.title.includes('910B3'),
    JSON.stringify(leaf && leaf.id))
  const stLeaf = r?.tree?.staged?.['note-abc.md']
  check('目录树含 staged/note-abc.md（status=staged）',
    stLeaf && stLeaf.__leaf === true && stLeaf.status === 'staged')
}

console.log('── /api/state 溯源 ──')
{
  const r = await J(await call('/aico-llm-wiki/api/state'))
  const c = r?.knowledge?.committed?.find(p => p.id === 'env-vm')
  check('committed 带 srcs 数组（3 条来源）',
    c && Array.isArray(c.srcs) && c.srcs.length === 3, JSON.stringify(c && c.srcs))
  check('srcs 含会话锚点 session:// 与 URL',
    c && c.srcs.some(s => String(s).startsWith('session://')) && c.srcs.some(s => /^https?:/.test(String(s))))
  const st = r?.knowledge?.staged?.find(p => p.id === 'note-abc')
  check('staged 也带 srcs', st && Array.isArray(st.srcs) && st.srcs[0] === 'session://ff0011')
}

console.log('── /vendor 静态路由 ──')
{
  const r = await call('/aico-llm-wiki/vendor/d3.min.js')
  // jsdelivr 的 d3 dist 头部是版权注释（// https://d3js.org v7.x…），
  // 判特征而不是判首字符：forceSimulation/d3.zoom 是图谱交互真正依赖的 API。
  check('d3.min.js 200 且含 forceSimulation/zoom（图谱依赖）',
    r.code === 200 && String(r.body).includes('forceSimulation') && String(r.body).includes('zoom'),
    'code=' + r.code + ' len=' + String(r.body).length)
  const bad = await call('/aico-llm-wiki/vendor/../../package.json')
  check('★ 越界守卫：../package.json 拒绝（404）', bad.code === 404, 'code=' + bad.code)
  const nf = await call('/aico-llm-wiki/vendor/nope.exe')
  check('MIME 白名单外后缀拒绝', nf.code === 404)
}

console.log('── /api/graph（handler 级）──')
{
  const r = await J(await call('/aico-llm-wiki/api/graph'))
  check('200 且节点带服务端布局坐标', r && r.ok === true && r.nodes?.every?.(n => Number.isFinite(n.x) && Number.isFinite(n.y)))
  check('stats 口径', r && r.stats?.nodes === 2)
}

console.log('── 客户端渲染（目录树 + 来源列）──')
const { hasReact, loadHarness } = await import('./lib/ui-harness.mjs')
if (!hasReact()) {
  console.log('  SKIP  没有 react，跳过渲染断言')
} else {
  const H = await loadHarness()
  const M = H.build(true)
  const { sourceKind, KnowledgeTab } = { sourceKind: M.__logic.sourceKind, KnowledgeTab: M.__components.KnowledgeTab }

  check('sourceKind：session:// → 会话', sourceKind('session://ea879c25').kind === 'session')
  check('sourceKind：URL → 链接 + href', sourceKind('https://a.b/c/d.md').kind === 'url' && !!sourceKind('https://a.b/c/d.md').href)
  check('sourceKind：路径 → 文档', sourceKind('D:/x/规格.md').kind === 'doc')

  const state = await call('/aico-llm-wiki/api/state').then(r => JSON.parse(r.body))
  const html = H.renderToStaticMarkup(H.h(KnowledgeTab, { state }))
  check('知识表渲染「来源」列且 chips 带类型（会话/链接）',
    html.includes('来源') && html.includes('会话') && html.includes('链接'))
  check('URL 来源渲染为可点链接（target=_blank）', /href="https?:[^"]*"/.test(html))
}

try { await rm(ROOT, { recursive: true, force: true }) } catch { /* 临时目录尽力而为 */ }

console.log('')
if (failures) { console.log('FAIL ' + failures + ' 条断言没过'); process.exit(1) }
console.log('全部通过')
