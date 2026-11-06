// ═══ 00-boot.js · 启动段：window.__ModuleLoader__ 装载 + React / DSH 原语引入 + API 端点常量 ═══
// （源码文件，编辑后运行 pnpm run build:client 合成 client/client.js）
/**
 * aico-llm-wiki —— 浏览器半。
 *
 * 零构建：手写 CJS，由 window.__ModuleLoader__ 装载；react 与 DSH 原语经
 * factory 的 require 注入。契约来自 DSH 自己的客户端插件
 * （@deepseek-ai/dsh-client-ui-agent-preset），不是猜的。
 *
 * 这一版重写的要点（结构：列固定、行是活的表）：
 *   1. 用 DSH 自己的 @deepseek-ai/dsh-client-ui-primitives —— Modal / Button /
 *      Pill / StateDot / MarkdownText / Input 和图标。这是"长得像 DSH"唯一
 *      诚实的做法：不是模仿它的皮，而是用它的组件。
 *   2. 颜色全部走真实存在的 --dsw-alias-* 变量。上一版用的
 *      --dsw-alias-bg-hover / -border / -bg-elevated / -text **四个都不存在**，
 *      因为有回退色，所以一直静默失效——界面上的硬编码色从没跟过主题。
 *   3. 技能第一次有了位置（能力页签），成本拆成两笔：常驻（目录摘要，每轮都付）
 *      与触发（正文，只有真调用才付）。混着算会把结论说反。
 *   4. 每条知识可以就地读全文：展开行内取正文，不再二次弹窗。
 * 结构：factory 体内按「模块分区」组织 —— env/api/format/ui/style/components/<页签>/contract，
 * 各分区以「// ── 模块：… ──」注释标界；分区是物理重排，函数仍靠提升互相引用。
 */

window.__ModuleLoader__.load({
  id: 'aico-llm-wiki',
  factory: (require) => {
// ── 模块：env ──────────────────────────────────────────────────────
// React 取用与 DSH 原语退化（P）：require 失败只能退化、不能抛。
// 被本文件所有后续模块引用。

    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    var React = require('react')
    var h = React.createElement
    var useState = React.useState
    var useEffect = React.useEffect
    var useMemo = React.useMemo
    var useCallback = React.useCallback
    var useRef = React.useRef

    /**
     * DSH 原语。拿不到就退化，绝不抛。
     * 这个文件是插件的浏览器半——require 失败会让 UI **整个消失**，
     * 而不是变丑。宁可丑，不可无。
     */
    var P = {}
    try {
      P = require('@deepseek-ai/dsh-client-ui-primitives') || {}
    } catch (e) {
      if (typeof console !== 'undefined') console.error('[aico-llm-wiki] DSH 原语不可用，退化为原生元素：', e)
    }

// ── 模块：api ──────────────────────────────────────────────────────
// 端点常量与取数封装（readJson/fail/getJson/post）。
// 被各 components/* 页签组件调用。
// （本文件只含端点常量；封装函数在 02-styles.js 尾部。）

    var API = '/aico-llm-wiki/api/state'
    var PAGE_API = '/aico-llm-wiki/api/page'
    var TRIAGE_API = '/aico-llm-wiki/api/triage'
    // 模型目录单独一条端点：列 provider/模型可能打网络，不能并进每 8 秒轮询的
    // /api/state。只在打开「模型」页签时取一次。
    var MODELS_API = '/aico-llm-wiki/api/models'
    var LLM_API = '/aico-llm-wiki/api/llm'
    var HARVEST_API = '/aico-llm-wiki/api/harvest'
    // 图谱也是独立端点：建图要遍历全库，不进 8 秒轮询（与服务端同一取舍）。
    var GRAPH_API = '/aico-llm-wiki/api/graph'
