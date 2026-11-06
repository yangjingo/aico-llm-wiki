// ═══ 01-primitives.js · UI 原语包装：Ico / Btn / Chip / Dot / Field / Md（宿主原语优先，退化不抛） ═══
// （源码文件，编辑后运行 pnpm run build:client 合成 client/client.js）
// ── 模块：ui（原语退化组件部分）──────────────────────────────────
// 原语退化组件（Ico/Btn/Chip/Dot/Field/Md/Chev）与 toast/openDoc。
// 依赖 env 的 P、api 的 OPEN_DOC_API。
// （本文件只含 Ico/Btn/Chip/Dot/Field/Md；Chev/toast/openDoc 在 03-utils.js。）
    /** DSH 图标；没有原语时返回 null（不画假的代替品）。 */
    function Ico(name, size) {
      var C = P[name]
      if (!C) return null
      return h(C, { size: size || 16 })
    }
    /** 按钮：原生 Button 优先。 */
    function Btn(props) {
      if (P.Button) return h(P.Button, props)
      return h('button', {
        type: 'button', className: props.className, onClick: props.onClick,
        disabled: props.disabled, title: props.title,
      }, props.icon || null, props.children)
    }
    /** 胶囊标签：原生 Pill 优先。 */
    function Chip(props) {
      if (P.Pill) return h(P.Pill, props)
      return h('span', { className: 'lw-chip' + (props.active ? ' lw-on' : '') + (props.className ? ' ' + props.className : '') }, props.children)
    }
    /** 状态点：原生 StateDot 优先。 */
    function Dot(props) {
      if (P.StateDot) return h(P.StateDot, props)
      return h('span', { className: 'lw-dot lw-dot-' + props.state })
    }
    /**
     * 输入框：原生 Input 优先。
     * 注意：原语的 className 落在外层 <span>，其余 props 才落在真 <input> 上
     * （源码里就是这么分的）。所以外层用 .lw-field 撑开，内层不掺和。
     */
    function Field(props) {
      if (P.Input) return h(P.Input, props)
      var cls = ('lw-input ' + (props.className || '')).trim()
      return h('input', Object.assign({}, props, { className: cls }))
    }
    /** Markdown：原生 MarkdownText 优先；退化时按纯文本显示，不假装会渲染。 */
    function Md(props) {
      var text = String(props.text || '')
      if (P.MarkdownText) return h(P.MarkdownText, { text: text })
      return h('pre', { className: 'lw-pre' }, text)
    }