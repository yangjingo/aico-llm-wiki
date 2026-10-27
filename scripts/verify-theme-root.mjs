/**
 * 离线断言：主题组与换库的数据形状。
 * —— THEMES 每个 id 必须在 CSS 里有 .lw-shell[data-theme="<id>"] 变量组；
 *     否则选了主题却没效果（选了"深色"还是白的），这种坏法肉眼看半天。
 * —— loadTheme 对非法存储值必须回退 default。
 * 用法：node scripts/verify-theme-root.mjs
 */
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const src = readFileSync(new URL('../client/client.js', import.meta.url), 'utf8')
const React = new Proxy({}, { get: (t, k) => (k === 'createElement' ? (...a) => a : () => [undefined, () => {}]) })
let mod = null
const store = new Map()
const sandbox = {
  window: { __ModuleLoader__: { load(spec) { mod = spec.factory(() => React) } } },
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
  },
}
vm.createContext(sandbox)
new vm.Script(src, { filename: 'client.js' }).runInContext(sandbox)

const L = mod.__logic
let failures = 0
const check = (label, ok, detail = '') => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + label + (detail ? '  — ' + detail : ''))
  if (!ok) failures++
}

// CSS 是数组 join 的，拼成一张表再找选择器。
const css = mod.__css || mod.__logic.CSS || ''
const sheet = typeof css === 'string' ? css : css.join('\n')

// ★ 关键布局规则必须逐条出现在样式表里：一条"无选择器的声明碎片"就能让
//   CSS 解析器的错误恢复吞掉它**后面**的整条规则（实测：孤儿碎片吞掉了
//   .lw-center-full，全屏接管页因此整页撑高、表格底部被窗口裁掉）。
//   语法完整性和关键选择器存在性都钉死，坏了当场红。
for (const sel of ['.lw-center-full{', '.lw-shell{', '.lw-body{', '.lw-work{', '.lw-main{', '.lw-pend{', '.lw-nav{']) {
  check('样式表完整包含 ' + sel.replace('{', ''), sheet.includes(sel),
    sheet.includes(sel) ? '' : '缺失 —— 检查它前面是否有无选择器的声明碎片')
}

for (const t of L.THEMES) {
  // default 的变量组就是 .lw-root 上的默认组；其余主题必须有 data-theme 块。
  const marker = t.id === 'default' ? '.lw-root{' : `.lw-shell[data-theme="${t.id}"]{`
  check(`主题 ${t.id} 有 CSS 变量组`, sheet.includes(marker))
  check(`主题 ${t.id} 有 label`, typeof t.label === 'string' && t.label.length > 0)
}
check('默认主题 id 是 default', L.THEMES[0].id === 'default')

store.set('lw-theme', 'dark')
check('loadTheme 读到已存主题', L.loadTheme() === 'dark')
store.set('lw-theme', '不存在的主题')
check('loadTheme 对非法值回退 default', L.loadTheme() === 'default')
store.clear()
check('loadTheme 空存储回退 default', L.loadTheme() === 'default')

// 换肤换库不应破坏既有判据：来源解析还在。
const k = L.sourceKind('D:/a.pdf#page=9')
check('sourceKind 仍正常（回归）', k.page === 9)

console.log(failures ? `\n${failures} 项失败` : '\n全部通过')
process.exit(failures ? 1 : 0)
