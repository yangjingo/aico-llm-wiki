// ═══ 11-todos.js · 待办组件：角标 + 输入框上方待办条 + 会话框提示卡 ═══
// （源码文件，编辑后运行 pnpm run build:client 合成 client/client.js）
// ── 模块：components/pending ──────────────────────────────────────
// 待办：订阅式 store（makeStore/useBench/usePending）+ 轮询（loadPending 等）+
// FooterEntry/PendItem/PendingBar + wiki_recall 对话内卡片（recall*/RecallFacts/RecallRow/RecallCard/WikiIcon）。

    // ── 待办：谁在等、怎么把面板打开 ─────────────────────────────────────
    //
    // 这一块要解决的是一个**非技术**问题：staged 固化与 .trash 分拣全靠人工，
    // 但界面上没有任何东西告诉你"有东西在等"——侧边栏入口是个沉默图标，
    // 于是 6 页暂存能一直积压到有人想起来去看。
    //
    // 两个座位（侧边栏入口、输入框上方提示条）都要能开同一个面板，
    // 所以开关**不能**是某个组件的 useState —— 那样另一处够不着。
    // 用一个极小的订阅式 store：谁都能 set，谁订阅谁重渲染。

    var PENDING_API = '/aico-llm-wiki/api/pending'

    function makeStore(initial) {
      var v = initial
      var subs = []
      return {
        get: function () { return v },
        set: function (next) {
          v = next
          for (var i = 0; i < subs.length; i++) { try { subs[i]() } catch (e) { /* 一个订阅者坏了不该拖垮其余 */ } }
        },
        subscribe: function (f) {
          subs.push(f)
          return function () { var i = subs.indexOf(f); if (i >= 0) subs.splice(i, 1) }
        },
        count: function () { return subs.length },
      }
    }

    /** 面板开关 + 打开时落在哪个页签。 */
    var benchStore = makeStore({ open: false, tab: null })
    function useBench() {
      var s = useState(benchStore.get())
      useEffect(function () { return benchStore.subscribe(function () { s[1](benchStore.get()) }) }, [])
      return s[0]
    }

    /**
     * 待办计数。**两个组件共用一个 store**，所以只轮询一次 ——
     * 各拉各的就会变成每 30 秒两条请求。
     *
     * 轮询间隔取 30 秒：这是"知识库攒了几页"这种尺度的事情，
     * 秒级刷新没有意义，只会白烧磁盘。不可见时一律不拉。
     */
    var pendingStore = makeStore({ data: null, err: null })
    var pendingTimer = null
    function loadPending() {
      return getJson(PENDING_API).then(function (r) {
        var prev = pendingStore.get()
        if (r.j && r.j.ok) pendingStore.set({ data: r.j, err: null })
        else pendingStore.set({ data: prev.data, err: r.error || (r.j && r.j.error) || ('HTTP ' + r.status) })
      })
    }
    function startPendingPolling() {
      if (pendingTimer) return
      loadPending()
      pendingTimer = setInterval(function () {
        if (typeof document === 'undefined' || document.visibilityState !== 'hidden') loadPending()
      }, 30000)
    }
    /**
     * 没人订阅了就停表。
     *
     * 为什么必须停：客户端插件是会被**重新装配**的（改配置就会），而模块级
     * 定时器不会随组件卸载消失 —— 每重载一次就多一个每 30 秒拉一次的定时器。
     * 攒几次就变成"明明没人看，磁盘却一直在响"，而且这类泄漏不报错、只累积。
     */
    function stopPendingIfIdle() {
      if (pendingStore.count() > 0) return
      if (pendingTimer) { clearInterval(pendingTimer); pendingTimer = null }
    }
    function usePending() {
      var s = useState(pendingStore.get())
      useEffect(function () {
        startPendingPolling()
        var un = pendingStore.subscribe(function () { s[1](pendingStore.get()) })
        return function () { un(); stopPendingIfIdle() }
      }, [])
      return s[0]
    }

    /** 待办总数。0 表示"没事等你"，界面据此决定要不要出现。 */
    function pendingTotal(d) {
      if (!d) return 0
      return (d.stagedTotal || 0) + (d.trash || 0) + (d.rejected || 0)
    }

    /**
     * 侧边栏底栏入口（座位：sidebar.footer.action）。
     *
     * ★ 必须吃 wide。座位契约写得很直白：
     *   「Whether the sidebar renders wide content (false = 56px rail)」。
     *   原先这个组件一个 props 都不接，于是侧边栏一收起，它还当着"图标 + 文字"
     *   的整行宽，而旁边的 cordis 单元格和下面的设置钮都收成了 36px 圆 —— 三者对不齐，
     *   这就是"标签没有与最下方设置平齐"。
     *
     * 外层以前是 display:contents 的壳子。现在换成 Fragment：壳子虽然不产生盒子，
     * 却是**单元格的 DOM 父节点**，而 CSS 要靠 *:has(> .lw-fb-cell) 从单元格往上
     * 选到宿主那一行（:has 走的是 DOM 树）。用 Fragment 让单元格的父节点就是宿主。
     */
    function FooterEntry(props) {
      ensureStyle()
      // 老调用点和测试会不传 props —— 缺省按"宽"渲染。
      var wide = !props || props.wide !== false
      var bench = useBench()
      var open = bench.open
      var p = usePending()
      useEffect(function () {
        if (!open) return
        var onKey = function (e) { if (e.key === 'Escape') benchStore.set({ open: false, tab: null }) }
        document.addEventListener('keydown', onKey)
        return function () { document.removeEventListener('keydown', onKey) }
      }, [open])
      var icon = Ico('IconSkillOutline16', 16)
      var n = pendingTotal(p.data)
      // 标题里把数字说全 —— 光一个角标不解释是什么在等。轨道态下标签不渲染，
      // 这条 title 就是唯一还能说明"这是什么、有几件事"的地方。
      var tip = n > 0
        ? 'aico-wiki —— ' + (p.data.stagedReady || 0) + ' 页可固化 / ' + (p.data.stagedTotal || 0) + ' 页暂存，' + ((p.data.trash || 0) + (p.data.rejected || 0)) + ' 个待分拣'
        : 'aico-wiki —— 能力 / 知识 / 补料'
      return h(React.Fragment, null,
        h('div', { className: 'lw-fb-cell' + (wide ? '' : ' lw-fb-cell-rail') },
          h('button', {
            type: 'button',
            className: 'lw-fb' + (wide ? '' : ' lw-fb-rail'),
            title: tip,
            // 轨道态没有可见标签，按钮的**可及名**只能靠这里。
            'aria-label': 'aico-wiki',
            'aria-expanded': open,
            onClick: function () { benchStore.set({ open: !open, tab: open ? null : null }) },
          },
            icon,
            wide ? h('span', { className: 'lw-fb-label' }, 'aico-wiki') : null,
            // 角标只在**真有事**时出现。永远显示一个 0 会训练人忽略它。
            // 轨道态只画点不写数字（36px 圆里放不下），数字留在 title 里。
            n > 0 ? h('span', { className: 'lw-fb-dot' }, wide ? String(n) : '') : null,
          )
        ),
        open ? h(Workbench, { initialTab: bench.tab || undefined, onClose: function () { benchStore.set({ open: false, tab: null }) } }) : null
      )
    }

    var PEND_PAGE_API = '/aico-llm-wiki/api/page'
    /** 待固化清单里的一页：标题 + 可展开的正文预览。
     *  固化是把蒸馏产物升入 L1 的闸门，闸门要人**看得见内容**才守得住——
     *  所以确认态必须能逐页翻，而不是只给一个总数。 */
    function PendItem(props) {
      var x = props.item
      var openState = useState(false)
      var open = openState[0], setOpen = openState[1]
      var dState = useState(null)          // /api/page 的正文数据
      var d = dState[0]
      var errState = useState(null)
      var err = errState[0]
      var toggle = function () {
        var next = !open
        setOpen(next)
        if (next && !d && !err) {
          getJson(PEND_PAGE_API + '?id=' + encodeURIComponent(x.id)).then(function (r) {
            if (r.j && r.j.ok) dState[1](r.j)
            else errState[1]((r.j && r.j.error) || r.error || ('HTTP ' + r.status))
          })
        }
      }
      var body = null
      if (open) {
        var inner = null
        if (err) inner = h('span', { className: 'c-bad' }, '读不到正文：' + err)
        else if (!d) inner = h('span', { className: 'c-dim' }, '读取正文…')
        else {
          var text = String(d.body || '（无正文）')
          inner = h('div', { className: 'lw-pend-preview' }, text.slice(0, 800) + (text.length > 800 ? '…' : ''))
        }
        var srcLine = null
        if (d) {
          var srcs = Array.isArray(d.sources) ? d.sources : []
          if (srcs.length === 0) {
            srcLine = h('div', { className: 'lw-pend-srcline c-bad' }, '这条知识没有来源——按闸门它本就不该出现在这里。')
          } else {
            srcLine = h('div', { className: 'lw-pend-srcline' },
              h('span', { className: 'c-dim' }, '来源：'),
              srcs.map(function (u, i) {
                var sk = sourceKind(u)
                if (sk.kind === 'doc' && sk.docPath) {
                  return h('a', { key: i, href: '#', title: sk.full + '（点击打开）', onClick: function (e) { e.preventDefault(); openDoc(sk) } }, sk.short)
                }
                return h('span', { key: i, title: sk.full }, sk.short)
              }))
          }
        }
        body = h('div', { className: 'lw-pend-itembody' }, inner, srcLine)
      }
      return h('div', { className: 'lw-pend-item' },
        h('button', { type: 'button', className: 'lw-pend-itemhead', 'aria-expanded': open ? 'true' : 'false', onClick: toggle },
          h('span', { className: 'lw-pend-itemdot' + (x.ready ? '' : ' off') }, '●'),
          h('span', { className: 'lw-pend-itemtitle', title: x.title }, x.title || x.id),
          x.confidence != null ? h('span', { className: 'lw-pend-itemconf' }, '置信 ' + x.confidence) : null,
          x.category ? h('span', { className: 'lw-pend-itemcat' }, x.category) : null,
          h('span', { className: 'lw-pend-itemchev' }, open ? '收起' : '查看')),
        body)
    }

    /** 待办条弹出的"已见基线"（模块级：跨挂载记住上次见过的待办总数）。 */
    var PEND_SEEN = { total: null }

    /**
     * 输入框上方的常驻提示条（座位：conversation.input.dock —— 它给的就是一行）。
     *
     * 设计取舍：
     *   * 计数为 0 时**整条不渲染**。一个永远写"0 待办"的条子只是噪音，
     *     而噪音会让人连"1 页待固化"也一起忽略。
     *   * 「全部固化」是**两段式**的：先问一句再动手。它一次写多个文件，
     *     误触的代价比多一次点击大。per-page 的固化入口仍在面板里。
     *   * 这里**不做**自动固化。staged 是防投毒闸门（LLM 蒸馏出来的东西
     *     一旦进 pages/ 就参与自动召回），拍板必须是人。这条条子只负责
     *     把该拍板的事推到眼前，不替人拍。
     */
    function PendingBar(props) {
      ensureStyle()
      // 欢迎页（hero，无会话）不渲染：座位注入的 inSession=false 说明还没进任何
      // 会话，此时输入框上方不该压一条实时提醒——那正是截图里"初始页顶部多一条"
      // 的来源。受控模式（props.pending，离线渲染/截图）不受此限制。
      if (props && props.inSession === false && props.pending === undefined) return null
      var p = usePending()
      // 受控模式：调用方直接给数据（离线渲染与截图用）——与 PanelBody 同一套惯例。
      // 服务端渲染不跑 useEffect，不给这个口子就永远只能渲染出"空"，
      // 于是"这条子到底长什么样"没有任何自动化断言。
      if (props && props.pending) p = { data: props.pending, err: null }
      var confirming = useState(false)
      var ask = confirming[0], setAsk = confirming[1]
      var busy = useState(false)
      var working = busy[0], setWorking = busy[1]
      var noteState = useState(null)
      var note = noteState[0], setNote = noteState[1]

      var d = p.data
      var total = pendingTotal(d)
      // ── 瞬态化：不再"有待办就常驻"，只在**新待办出现的那一刻**弹出一次 ──
      // 以前 total>0 就常驻输入框上方，用户永远学不会忽略它。现在：
      // 计数比上次见过的多 → 弹出，8 秒后自动收起（确认/固化流程打开时不收）；
      // 计数回落（处理掉了）→ 立即收起并把基线抹平。seenRef 记"上次见过多少"。
      var freshState = useState(false)
      var fresh = freshState[0], setFresh = freshState[1]
      var seenRef = useRef(PEND_SEEN.total)
      var flowRef = useRef(false)
      useEffect(function () { flowRef.current = !!(ask || working || note) }, [ask, working, note])
      useEffect(function () {
        if (!d) return
        var prev = seenRef.current
        if (prev == null) { seenRef.current = total; return }  // 首次拿到数据不算"新"
        if (total > prev) {
          seenRef.current = total
          setFresh(true)
          var t = window.setTimeout(function () {
            if (!flowRef.current) setFresh(false)   // 确认/固化进行中不打断
          }, 8000)
          return function () { window.clearTimeout(t) }
        }
        if (total < prev) { seenRef.current = total; setFresh(false) }
      }, [total])
      if (!d || total === 0 || !fresh) return null

      var ready = d.stagedReady || 0
      var triage = (d.trash || 0) + (d.rejected || 0)

      var commitAll = function () {
        setWorking(true); setNote(null)
        var ids = (d.staged || []).filter(function (x) { return x.ready }).map(function (x) { return x.id })
        var okN = 0, failN = []
        var step = function (i) {
          if (i >= ids.length) {
            setWorking(false); setAsk(false)
            setNote(okN + ' 页已固化' + (failN.length ? '，' + failN.length + ' 页失败：' + failN.join('、') : ''))
            loadPending()
            return
          }
          post('/aico-llm-wiki/api/commit', { id: ids[i] }).then(function (r) {
            if (r.j && r.j.ok) okN++ ; else failN.push(ids[i])
            step(i + 1)
          })
        }
        // 逐个提交而不是并发：每个页面各自过一次 commitReadiness 闸门，
        // 并发发起只会让失败信息互相盖住。
        step(0)
      }

      // 两个计数各自**可点**，各自开对应的页签。
      //
      // 之前只有一个笼统的「处理」按固定顺序挑一个页签 —— 而那意味着
      // "12 个待分拣"旁边那个按钮会把你送到知识页签，而那里根本没有分拣界面。
      // 数字和它点开的东西必须对得上，否则这个条子就是在骗人。
      var chips = []
      if (d.stagedTotal > 0) {
        chips.push(h('button', {
          key: 's', type: 'button', className: 'lw-pend-chip',
          title: '打开「知识」页签，逐页看再决定固化',
          onClick: function () { setFresh(false); benchStore.set({ open: true, tab: 'knowledge' }) },
        }, h('b', null, String(d.stagedTotal)), ' 页待固化'))
      }
      if (triage > 0) {
        chips.push(h('button', {
          key: 't', type: 'button', className: 'lw-pend-chip',
          title: '打开「分拣」页签，恢复或永久删除',
          onClick: function () { setFresh(false); benchStore.set({ open: true, tab: 'triage' }) },
        }, h('b', null, String(triage)), ' 个待分拣'))
      }

      return h('div', {
        // ★ lw-root 不能省：整套 --lw-* 变量定义在 .lw-root 上而不是 :root，
        //   而这条子挂在 composer 里，离 .lw-root 很远。
        className: 'lw-pend lw-root',
        role: 'status',
        'aria-live': 'polite',
      },
        // AICO 印章 + 品牌名：这张卡片的身份。数字和按钮才是内容。
        h('span', { className: 'lw-pend-mark', 'aria-hidden': 'true' }, 'A'),
        h('div', { className: 'lw-pend-main' },
          h('span', { className: 'lw-pend-brand' }, 'AICO · WIKI'),
          h('span', { className: 'lw-pend-txt' },
            ask
              ? '确认固化这 ' + ready + ' 页？固化后它们立刻参与自动召回。'
              : (note ? note : chips.reduce(function (acc, x) { return acc.concat(acc.length ? [' · '] : [], [x]) }, []))
          ),
          // 确认态附上逐页清单：审核要看得见内容，总数不够拍板。
          ask && Array.isArray(d.staged) && d.staged.length
            ? h('div', { className: 'lw-pend-list' },
              d.staged.map(function (x) { return h(PendItem, { key: x.id, item: x }) }))
            : null
        ),
        ask ? h('button', {
          type: 'button', className: 'lw-btn primary', disabled: working,
          onClick: commitAll,
        }, working ? '固化中…' : '确认固化') : null,
        ask ? h('button', {
          type: 'button', className: 'lw-btn', disabled: working,
          onClick: function () { setAsk(false) },
        }, '取消') : null,
        !ask && ready > 0 ? h('button', {
          type: 'button', className: 'lw-btn primary',
          onClick: function () { setAsk(true); setNote(null) },
        }, '全部固化') : null,
        !ask && note ? h('button', {
          type: 'button', className: 'lw-btn',
          onClick: function () { setNote(null) },
        }, '知道了') : null
      )
    }

    /* ── wiki_recall 的对话内卡片 ───────────────────────────────────────────
     *
     * 为什么值得做：wiki_recall 的结论是三档判定（hit / weak / miss），而通用工具
     * 卡片把它渲染成一大坨 JSON —— 那正是这个插件最需要人一眼看懂的东西。
     *
     * 机制（核实过，不是想当然）：宿主 dsh-client-ui-tool 的 ToolCall 用
     *   renderSlot("tool.call.toolview", owner, { entryKey: toolName, fallback: GenericToolCard })
     * keyed 命中就**替换**通用行。而 toolName 对 PTC 模式下 run_code 里的嵌套调用
     * 同样是真实的（宿主把嵌套调用也渲染成 ToolResultNode），所以这个卡片在
     * 当前这种「一切走 run_code」的会话里也会生效，不是死代码。
     *
     * 两条硬约束，都来自这个项目自己的教训：
     *   1. **解析不了就返回 null**，让宿主回落到通用卡片。永远不要画一张半懂的卡片
     *      —— 一张说错话的卡片比一张难看的卡片坏得多。
     *   2. 样式只用既有 token 类（.lw-* / .c-*），与设置面板同一套变量。
     */

    /** 从 block 里取出这次调用的工具名与参数（形状与宿主一致：arguments 是 JSON 字符串）。 */
    function recallCallOf(block) {
      try {
        if (!block || typeof block !== "object") return null
        var content = block.content
        if (!Array.isArray(content)) return null
        for (var i = 0; i < content.length; i++) {
          var part = content[i]
          if (!part || part.type !== "tool-call") continue
          var args = part.arguments
          if (typeof args === "string") { try { args = JSON.parse(args) } catch (e) { args = null } }
          return { name: String(part.name || ""), args: args && typeof args === "object" ? args : {} }
        }
        return null
      } catch (e) { return null }
    }

    /** 结果文本：工具结果块里第一段 text。取不到返回空串。 */
    function recallResultText(block) {
      try {
        var content = block && block.content
        if (!Array.isArray(content)) return ""
        for (var i = 0; i < content.length; i++) {
          var part = content[i]
          if (part && part.type === "tool-result" && Array.isArray(part.content)) {
            for (var j = 0; j < part.content.length; j++) {
              var c = part.content[j]
              if (c && c.type === "text" && typeof c.text === "string") return c.text
            }
          }
        }
        return ""
      } catch (e) { return "" }
    }

    /**
     * 纯函数：block → 卡片模型，或 null（回落通用卡片）。
     *
     * 抽成纯函数是为了能被穷举断言 —— 这个文件里的组件很难在测试里点，
     * 但"给一段真实的工具结果，卡片该说什么"是可以逐条钉死的。
     */
    function recallCardModel(block) {
      var call = recallCallOf(block)
      if (!call || call.name !== "wiki_recall") return null
      var text = recallResultText(block)
      if (!text) return null          // 仍在运行：还没有结果，交给通用卡片去转圈
      var data = null
      try { data = JSON.parse(text) } catch (e) { return null }   // 解析不了就别猜
      if (!data || typeof data !== "object") return null
      var bucket = String(data.bucket || "")
      if (bucket !== "hit" && bucket !== "weak" && bucket !== "miss") return null
      var hit = Array.isArray(data.hit) ? data.hit : []
      var weak = Array.isArray(data.weak) ? data.weak : []
      var pages = hit.concat(weak).map(function (p) {
        return {
          id: String((p && p.id) || ""),
          title: String((p && p.title) || (p && p.id) || "(无标题)"),
          score: Number(p && p.score) || 0,
          confidence: Number(p && p.confidence) || 0,
          category: String((p && p.category) || ""),
          bucket: hit.indexOf(p) >= 0 ? "hit" : "weak",
          usageClass: String((p && p.usage && p.usage.class) || "new"),
          warning: (p && p.warning) || "",
          sourceCount: Array.isArray(p && p.sources) ? p.sources.length : 0,
          hasBody: !!(p && typeof p.body === "string" && p.body.length > 0),
        }
      })
      return {
        query: String((call.args && call.args.query) || ""),
        bucket: bucket,
        bestScore: Number(data.bestScore) || 0,
        hitCount: hit.length,
        weakCount: weak.length,
        totalRecallable: Number(data.totalRecallable) || 0,
        note: typeof data.note === "string" ? data.note : "",
        pages: pages,
      }
    }

    var RECALL_LABEL = {
      hit: { text: "命中 · 注入正文", cls: "c-ok" },
      weak: { text: "弱命中 · 只给标题", cls: "c-warn" },
      miss: { text: "未命中 · 无可用知识", cls: "c-bad" },
    }

    /** 一行胶囊：分数 / 分类 / 证据。全部来自工具结果本身，不额外请求。 */
    function RecallFacts(props) {
      var p = props.page
      var chips = [
        h("span", { key: "s", className: "lw-recall-chip" }, p.score.toFixed(3)),
        p.category ? h("span", { key: "c", className: "lw-recall-chip" }, p.category) : null,
        h("span", { key: "conf", className: "lw-recall-chip" }, "置信 " + p.confidence.toFixed(2)),
        p.sourceCount ? h("span", { key: "src", className: "lw-recall-chip c-dim" }, p.sourceCount + " 来源") : null,
        p.usageClass && p.usageClass !== "new" ? h("span", { key: "u", className: "lw-recall-chip c-dim" }, p.usageClass) : null,
      ].filter(Boolean)
      return h("span", { className: "lw-recall-facts" }, chips)
    }

    function RecallRow(props) {
      var p = props.page
      var openState = useState(false)
      var open = openState[0], setOpen = openState[1]
      return h("div", { className: "lw-recall-row" },
        h("div", { className: "lw-recall-rowhead" },
          h("span", { className: "lw-recall-dot " + (p.bucket === "hit" ? "c-ok" : "c-warn") }, "●"),
          h("span", { className: "lw-recall-title", title: p.id }, p.title),
          h(RecallFacts, { page: p }),
          p.warning ? h("span", { className: "lw-recall-chip c-bad", title: p.warning }, "⚠ 已隔离") : null,
          h("button", {
            type: "button",
            className: "lw-recall-toggle",
            "aria-expanded": open ? "true" : "false",
            onClick: function () { setOpen(!open) },
          }, open ? "收起" : "详情")
        ),
        open ? h("div", { className: "lw-recall-detail" },
          h("div", { className: "lw-recall-kv" }, h("span", { className: "c-dim" }, "id"), " ", p.id),
          h("div", { className: "lw-recall-kv" }, h("span", { className: "c-dim" }, "正文"), " ",
            p.hasBody ? "本次调用已带回（模型已看到）" : "未带回（没传 includeBody）"),
          p.warning ? h("div", { className: "lw-recall-kv c-bad" }, p.warning) : null
        ) : null
      )
    }

    /** 对话内卡片本体。数据全部来自这次调用的结果，不发任何请求。 */
    function RecallCard(props) {
      var model = useMemo(function () { return recallCardModel(props && props.block) }, [props && props.block])
      if (!model) return null
      var label = RECALL_LABEL[model.bucket] || RECALL_LABEL.miss
      return h("div", { className: "lw-root lw-recall" },
        h("div", { className: "lw-recall-head" },
          h("span", { className: "lw-recall-verdict " + label.cls }, label.text),
          h("span", { className: "lw-recall-query", title: model.query }, model.query || "(空查询)"),
          h("span", { className: "lw-recall-best c-dim" }, "best " + model.bestScore.toFixed(3))
        ),
        h("div", { className: "lw-recall-sum c-dim" },
          model.hitCount + " 命中 · " + model.weakCount + " 弱命中 · 可召回 " + model.totalRecallable + " 页"),
        model.pages.length > 0
          ? h("div", { className: "lw-recall-list" },
            model.pages.map(function (p) { return h(RecallRow, { key: p.id || p.title, page: p }) }))
          : h("div", { className: "lw-recall-note c-dim" }, model.note || "没有可召回的知识页。"),
        model.pages.length > 0 && model.note
          ? h("div", { className: "lw-recall-note c-dim" }, model.note)
          : null
      )
    }
    /* ── 主面板接管与插件页入口（对齐 aida-lld 的 0.2.0 形式）─────────────
     *
     * 三个入口、同一个 main 面板：
     *   1. composer 命令 aico-wiki（popupSelect 选页签直达）；
     *   2. 「插件」页独立卡片（plugins.item）+ 本插件详情页区块（plugins.detail.section）；
     *   3. 原有侧栏 learn-wiki→aico-wiki 入口（模态面板，保留为后备）。
     * main 面板注册一次、常驻：开/关只切 layout.selectPanel，绝不注销注册
     * （同 key 重复注册在 dispose 后不被宿主重新接纳——aida-lld 踩过：
     * 「首次可开、关闭后再开无效」）。
     */

    /** wiki 图标：书页 + 连线节点（stroke 1.5，currentColor）。 */
    function WikiIcon(size) {
      var s = size || 16
      return h('svg', { viewBox: '0 0 16 16', width: s, height: s, 'aria-hidden': true, focusable: 'false' },
        h('g', { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
          h('path', { d: 'M2.5 3.5c2-1 4-1 5.5.5 1.5-1.5 3.5-1.5 5.5-.5v9c-2-1-4-1-5.5.5-1.5-1.5-3.5-1.5-5.5-.5z' }),
          h('path', { d: 'M8 4v9.5' })
        ),
        h('g', { fill: 'currentColor', stroke: 'none' },
          h('circle', { cx: 8, cy: 8, r: 1.2 }),
          h('circle', { cx: 12.5, cy: 6, r: 1.2 }),
          h('circle', { cx: 12.5, cy: 10.5, r: 1.2 })
        )
      )
    }

    /** 主面板内容：fixed 全屏接管整个 session 区域（含侧栏画布，spec 04 修订）。
     *  注入面（宿主平铺为 props）：close()、entryTab()（命令选中的页签）。
     *  agent 侧工具（wiki_recall 等）注册在宿主进程，不受 UI 接管影响。
     *  右上角关闭入口对齐 aida-lld：「关闭」拉条开关（真实拖拽，松手过半程
     *  关闭 / 否则 spring 回弹；单击直接 armed）→ 退场编排 → close()。
     *  退出机制不变：close() → panelDeactivate → layout.selectPanel(null)，
     *  main 注册常驻不注销（关掉还能再开）。 */
// ── 模块：components/plugin ───────────────────────────────────────
// 主面板接管与插件页入口：AicoWikiCenter/isOwnBundle/usePanelActive/AicoPluginItem/AicoPluginSection。
    function AicoWikiCenter(props) {
      ensureStyle()
      var entryTab = (typeof props.entryTab === 'function' ? props.entryTab() : props.entryTab) || 'graph'
      // 拉条几何（与 aida-lld 一致）：滑块直径 16 + 内边距 2，最大位移 30px。
      var KNOB_MAX = 30
      var armedState = useState(false)
      var armed = armedState[0], setArmed = armedState[1]
      var armedRef = useRef(false)
      var knobRef = useRef(null)
      var dragRef = useRef({ active: false, moved: false, startX: 0, delta: 0 })
      /** 直接写内联 transform；transition=false 时跟手（拖拽中）。 */
      var setKnob = function (x, transition) {
        if (!knobRef.current) return
        knobRef.current.style.transition = transition ? '' : 'none'
        knobRef.current.style.transform = 'translateX(' + x + 'px)'
      }
      var closeNow = function () { try { props.close && props.close() } catch (err) {} }
      /** armed：滑块滑向末端 + 退场编排(320ms)播完再退出（对齐 lld 的 500ms 节奏）。 */
      var trigger = function () {
        if (armedRef.current) return
        armedRef.current = true
        setArmed(true)
        if (knobRef.current) {
          knobRef.current.style.transition = ''
          knobRef.current.style.transform = 'translateX(' + KNOB_MAX + 'px)'
        }
        window.setTimeout(closeNow, 500)
      }
      var onPointerDown = function (e) {
        if (armedRef.current) return
        dragRef.current = { active: true, moved: false, startX: e.clientX, delta: 0 }
        e.currentTarget.setPointerCapture(e.pointerId)
        setKnob(0, false)
      }
      var onPointerMove = function (e) {
        var d = dragRef.current
        if (!d.active) return
        var delta = Math.max(0, Math.min(KNOB_MAX, e.clientX - d.startX))
        if (delta > 2) d.moved = true
        d.delta = delta
        setKnob(delta, false)
      }
      var onPointerUp = function (e) {
        var d = dragRef.current
        if (!d.active) return
        d.active = false
        try { e.currentTarget.releasePointerCapture(e.pointerId) } catch (err) {}
        if (d.delta > KNOB_MAX * 0.5) trigger()      // 拉过半程：armed + 退场
        else setKnob(0, true)                        // 未过半程：spring 回弹
      }
      var onClick = function () {
        if (dragRef.current.moved) { dragRef.current.moved = false; return }
        trigger()
      }
      // Esc 退出：全屏接管后宿主的返回路径（侧栏切换）被盖住，键盘必须有独立退路。
      // SSR/离线渲染没有 document，静默跳过。
      useEffect(function () {
        if (typeof document === 'undefined' || !props.close) return
        var onKey = function (e) { if (e.key === 'Escape') closeNow() }
        document.addEventListener('keydown', onKey)
        return function () { document.removeEventListener('keydown', onKey) }
      }, [props.close])
      return h('div', {
        id: 'aico-wiki-center',
        className: 'lw-center-full lw-root' + (armed ? ' lw-center-closing' : ''),
      },
        h('div', { className: 'lw-head' },
          h('span', { className: 'lw-headicon' }, WikiIcon(16)),
          h('span', { className: 'lw-title' }, 'aico-wiki'),
          h('span', { className: 'lw-tabsum' }, '本地知识库工作台'),
          // 右上角「关闭」拉条（对齐 aida-lld）：拖拽或单击关闭，Esc 仍可退出。
          h('div', {
            className: 'lw-pull' + (armed ? ' lw-pull-armed' : ''),
            role: 'switch',
            'aria-checked': armed ? 'true' : 'false',
            'aria-label': '关闭工作台（返回会话）',
            tabIndex: 0,
            title: '拉动或点击关闭工作台',
            onPointerDown: onPointerDown,
            onPointerMove: onPointerMove,
            onPointerUp: onPointerUp,
            onKeyDown: function (e) {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger() }
            },
            onClick: onClick,
          },
            h('span', { className: 'lw-pull-label' }, armed ? '正在返回' : '关闭'),
            h('span', { className: 'lw-pull-track', 'aria-hidden': true },
              h('span', { ref: knobRef, className: 'lw-pull-knob' }))
          )
        ),
        // key=entryTab：命令再次选中别的页签时强制重挂载，让 initialTab 生效。
        // PanelBody 的页签是内部 state，外部换 initialTab 不重挂载就没有效果。
        h(PanelBody, { key: entryTab, initialTab: entryTab })
      )
    }

    /** 本插件自己的 bundle？plugins.* 插槽的 subject 判据。 */
    function isOwnBundle(subject) {
      return subject && subject.kind === 'bundle'
        && subject.pkg && subject.pkg.name === 'aico-llm-wiki'
    }

    /** hook：订阅面板 active 状态（注入面给 isActive/subscribeActive，同 aida-lld）。 */
    function usePanelActive(props) {
      var st = useState(!!(props && props.isActive && props.isActive()))
      var active = st[0], setActive = st[1]
      useEffect(function () {
        if (!props || typeof props.subscribeActive !== 'function') return
        return props.subscribeActive(function () {
          setActive(!!(props.isActive && props.isActive()))
        })
      }, [props.isActive, props.subscribeActive])
      return active
    }

    /** plugins.item：summary=插件列表一行；page=点入后的二级页面卡片。 */
    function AicoPluginItem(props) {
      ensureStyle()
      var active = usePanelActive(props)
      if (props.subject !== undefined && !isOwnBundle(props.subject)) return null
      if (props.view === 'summary') {
        return h('span', null, active ? 'aico-wiki 工作台已打开，点开进入' : '本地知识库（知识 / 图谱）· 点开进入工作台')
      }
      return h('div', { className: 'lw-plug-card lw-plug-card--stack lw-root' },
        h('div', { className: 'lw-plug-card' },
          h('span', { className: 'lw-headicon' }, WikiIcon(20)),
          h('div', null,
            h('div', { className: 'lw-plug-title' }, 'aico-wiki · 本地知识库工作台'),
            h('p', { className: 'lw-plug-note' },
              '知识沉淀与召回（边干边学）、知识图谱可视化。打开后占满中央区域，侧边栏保持可用。')
          )
        ),
        h('div', null, h(Btn, { className: 'primary', onClick: active ? props.close : props.open },
          active ? '关闭工作台' : '打开工作台'))
      )
    }

    /** plugins.detail.section：本插件详情页正文区块。 */
    function AicoPluginSection(props) {
      ensureStyle()
      var active = usePanelActive(props)
      if (!isOwnBundle(props.subject)) return null
      return h('div', { className: 'lw-plug-card lw-root' },
        h('span', { className: 'lw-headicon' }, WikiIcon(20)),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { className: 'lw-plug-title' }, 'aico-wiki · 本地知识库工作台'),
          h('p', { className: 'lw-plug-note' }, '知识 / 图谱。composer 输入 aico-wiki 也可直达。')
        ),
        h(Btn, { className: 'primary', onClick: active ? props.close : props.open },
          active ? '关闭' : '打开工作台')
      )
    }
