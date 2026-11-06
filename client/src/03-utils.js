// ═══ 03-utils.js · 小工具：通用渲染辅助 ═══
// （源码文件，编辑后运行 pnpm run build:client 合成 client/client.js）
// ── 模块：format ───────────────────────────────────────────────────
// 纯函数：num/tok/when/CLS/clsInfo/SIG/sourceKind/num0。不碰 DOM，
// 离线可断言；判据经 contract 的 exports.__logic 暴露给结构测试。
// （num0 在 10-shell.js。）

    // ── 小工具 ────────────────────────────────────────────────────────────
    function num(n) {
      var v = Number(n)
      if (!isFinite(v)) return '—'
      return v.toLocaleString('en-US')
    }
    function tok(n) {
      var v = Number(n)
      if (!isFinite(v) || v <= 0) return '—'
      return '~' + v.toLocaleString('en-US')
    }
    function when(iso) {
      if (!iso) return '—'
      var t = Date.parse(iso)
      if (!isFinite(t)) return String(iso).slice(0, 10)
      var d = Math.floor((Date.now() - t) / 86400000)
      if (d <= 0) return '今天'
      if (d === 1) return '昨天'
      if (d < 30) return d + ' 天前'
      return String(iso).slice(0, 10)
    }

    var CLS = {
      confirmed: { label: '已确认', state: 'done', cls: 'c-ok' },
      suspect: { label: '疑似有害', state: 'error', cls: 'c-bad' },
      'suspect-watch': { label: '观察中', state: 'ongoing', cls: 'c-warn' },
      new: { label: '新页', state: 'ongoing', cls: 'c-info' },
      unconfirmed: { label: '未确认', state: 'idle', cls: 'c-3' },
      dead: { label: '死知识', state: 'idle', cls: 'c-dim' },
    }
    function clsInfo(k) { return CLS[k] || { label: k || '—', state: 'idle', cls: 'c-dim' } }

    var SIG = {
      'edit-churn': '反复改同一文件',
      'repeat-identical': '重复相同调用',
      'repeat-failure': '连续失败',
      'recurring-error': '反复撞同一错误',
    }

    /** 溯源（spec 06 修订 + 证据跳转扩展）：把一条 source 归类并给出短显示。
     *  三种形状：session://<id>（会话锚点，harvest 永远附）、http(s) URL、
     *  其余一律按文档路径。文档路径允许带页码锚（path.pdf#page=12 或 #p=12），
     *  解析出的 page 供「点击打开并跳页」用。纯函数，导出可穷举断言。 */
    function sourceKind(s) {
      var v = String(s ?? '')
      if (v.startsWith('session://')) {
        var sid = v.slice('session://'.length)
        return { kind: 'session', label: '会话', short: sid.length > 10 ? sid.slice(0, 8) + '…' : sid, full: v }
      }
      if (/^https?:\/\//i.test(v)) {
        try {
          var u = new URL(v)
          var path = (u.pathname && u.pathname !== '/') ? u.pathname.split('/').filter(Boolean).pop() : u.hostname
          return { kind: 'url', label: '链接', short: (path || u.hostname).slice(0, 24), full: v, href: v }
        } catch (e) {
          return { kind: 'url', label: '链接', short: v.slice(0, 24), full: v, href: v }
        }
      }
      if (!v) return { kind: 'doc', label: '文档', short: '(空)', full: v }
      // 页码锚：#page=12 / #p=12（模型在 sources 里标注 PDF 页码的约定形状）。
      var pm = v.match(/#p(?:age)?=(\d+)\s*$/i)
      var page = pm ? Number(pm[1]) : 0
      var pure = pm ? v.slice(0, pm.index) : v
      var base = pure.replace(/\\/g, '/').split('/').filter(Boolean).pop()
      return { kind: 'doc', label: '文档', short: ((base || pure) + (page ? ' ·P' + page : '')).slice(0, 26), full: v, docPath: pure, page: page }
    }

// ── 模块：ui（toast/openDoc 部分）────────────────────────────────
// （分区头见 01-primitives.js；含本文件后部的 Chev。）
    /** 轻提示：右下角一条，3 秒自灭。开文档成功/失败都不打断当前页面。 */
    function toast(text, bad) {
      try {
        var el = document.createElement('div')
        el.className = 'lw-toast' + (bad ? ' lw-toast-bad' : '')
        el.textContent = text
        document.body.appendChild(el)
        setTimeout(function () { el.remove() }, 3000)
      } catch (e) { /* 无 body 时（离线断言）静默 */ }
    }

    var OPEN_DOC_API = '/aico-llm-wiki/api/open-doc'
    /** 点证据开文档：POST /api/open-doc，服务端用默认程序打开；
     *  PDF 带页码时走浏览器 #page=N 直接跳页。结果用 toast 反馈。 */
    function openDoc(sk) {
      if (!sk || sk.kind !== 'doc' || !sk.docPath) return Promise.resolve()
      return post(OPEN_DOC_API, { path: sk.docPath, page: sk.page || 0 }).then(function (r) {
        if (r.j && r.j.ok) {
          toast('已打开' + (sk.page ? '（第 ' + sk.page + ' 页）' : '') + '：' + sk.docPath.split(/[\\/]/).pop())
        } else {
          toast('打开失败：' + ((r.j && r.j.error) || r.error || ('HTTP ' + r.status)), true)
        }
      })
    }
    function openDocSource(full) { return openDoc(sourceKind(full)) }

// ── 模块：components/knowledge（溯源 chips/占比条部分）───────────
// （分区主体见 06-knowledge.js；筛选/视图纯函数见 04-view-logic.js。）
    /** 一行溯源 chips：最多 2 个 + 「+N」，title 带全量。 */
    function SourceChips(props) {
      var list = (props.sources || []).map(sourceKind)
      if (list.length === 0) return h('span', { className: 'c-dim' }, '—')
      var shown = list.slice(0, 2)
      var rest = list.length - shown.length
      return h('span', { className: 'lw-srcline', title: list.map(function (x) { return x.label + '：' + x.full }).join('\n') },
        shown.map(function (x, i) {
          if (x.kind === 'doc' && x.docPath) {
            // 本地文档：点击交给服务端打开；带页码时直接跳页。
            return h('a', {
              key: i, className: 'lw-srcchip lw-src-doc', href: '#',
              title: x.full + (x.page ? '（点击打开并跳到第 ' + x.page + ' 页）' : '（点击打开）'),
              onClick: function (e) { e.preventDefault(); e.stopPropagation(); openDoc(x) },
            }, x.label + ' ' + x.short)
          }
          return x.href
            ? h('a', { key: i, className: 'lw-srcchip lw-src-' + x.kind, href: x.href, target: '_blank', rel: 'noreferrer', onClick: function (e) { e.stopPropagation() } }, x.label + ' ' + x.short)
            : h('span', { key: i, className: 'lw-srcchip lw-src-' + x.kind }, x.label + ' ' + x.short)
        }),
        rest > 0 ? h('span', { key: '+', className: 'lw-srcchip c-dim' }, '+' + rest) : null)
    }

    /** 展开箭头：有 DSH 图标就用，没有就用一个纯 CSS 三角。 */
    function Chev(props) {
      var c = Ico('IconChevronDownOutline14', 14)
      if (c) return h('span', { className: 'lw-chev' + (props.open ? '' : ' c') }, c)
      return h('span', { className: 'lw-chev' + (props.open ? '' : ' c'), 'aria-hidden': 'true' }, '▾')
    }

    /** 一条水平占比条。用于把"钱花在哪"变成一眼能比的东西。 */
    function BarRow(props) {
      var pct = props.max > 0 ? Math.max(1.5, Math.round((props.value / props.max) * 100)) : 0
      return h('div', { className: 'lw-lrow' },
        h('span', { className: 'lw-lname', title: props.name }, props.name),
        h('span', { className: 'lw-track' },
          h('span', { className: 'lw-fill' + (props.tone ? ' ' + props.tone : ''), style: { width: pct + '%' } })),
        h('span', { className: 'lw-lval' }, props.display != null ? props.display : num(props.value))
      )
    }