/**
 * 离线断言：sourceKind 的页码锚解析 + 跳转数据形状。
 * 纯逻辑，不需要 React / 浏览器。
 * 用法：node scripts/verify-open-doc.mjs
 */
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const src = readFileSync(new URL('../client/client.js', import.meta.url), 'utf8')
const React = new Proxy({}, { get: (t, k) => (k === 'createElement' ? (...a) => a : () => [undefined, () => {}]) })
let mod = null
const sandbox = {
  window: { __ModuleLoader__: { load(spec) { mod = spec.factory(() => React) } } },
}
vm.createContext(sandbox)
new vm.Script(src, { filename: 'client.js' }).runInContext(sandbox)

const k = mod.__logic.sourceKind
let failures = 0
const check = (label, ok, detail = '') => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + label + (detail ? '  — ' + detail : ''))
  if (!ok) failures++
}

const a = k('D:/docs/维护与服务指南 01.pdf#page=42')
check('PDF #page= 解析出页码', a.kind === 'doc' && a.page === 42, JSON.stringify(a))
check('docPath 去掉锚', a.docPath === 'D:/docs/维护与服务指南 01.pdf', a.docPath)
check('short 带页码提示', /P42/.test(a.short), a.short)

const b = k('D:/x/表.xlsx#p=3')
check('#p= 简写也认', b.page === 3, JSON.stringify(b))

const c = k('D:/x/表.xlsx')
check('无锚页码为 0', c.kind === 'doc' && c.page === 0 && c.docPath === 'D:/x/表.xlsx', JSON.stringify(c))

const d = k('D:\\win\\路径.pdf#PAGE=7')
check('大写锚也认（不区分大小写）', d.page === 7, JSON.stringify(d))

const e = k('D:/x/记#号文件.pdf')
check('普通 # 不误判为页码锚', e.page === 0 && e.docPath === 'D:/x/记#号文件.pdf', JSON.stringify(e))

const s = k('session://abc123')
check('session 不受影响', s.kind === 'session' && s.page == null, JSON.stringify(s))
const u = k('https://a.com/b.pdf#page=9')
check('URL 保持 href、不带 docPath', u.kind === 'url' && u.href === 'https://a.com/b.pdf#page=9' && u.docPath == null, JSON.stringify(u))

const anchor = k('D:/a.pdf#page=42')
check('点击数据齐备（docPath+page 可直接 POST /api/open-doc）', !!anchor.docPath && anchor.page === 42)

console.log(failures ? `\n${failures} 项失败` : '\n全部通过')
process.exit(failures ? 1 : 0)
