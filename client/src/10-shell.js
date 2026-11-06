// ═══ 10-shell.js · 外壳组件：主面板接管 + 二级界面（目录导航/KPI 带） ═══
// （源码文件，编辑后运行 pnpm run build:client 合成 client/client.js）
// ── 模块：components/shell ────────────────────────────────────────
// 外壳：TABS/tabsSummary/navBadge/titleParts/kpiItems/PanelBody/Workbench，
// 二级界面（spec 05 重绘）与换肤（loadTheme/saveTheme）、换库（RootSwitch）。
// （format 分区的 num0 也在本文件。）

    // ── 外壳 ──────────────────────────────────────────────────────────────
    var TABS = [
      { id: 'graph', label: '图谱' },
      { id: 'knowledge', label: '知识' },
      { id: 'triage', label: '分拣' },
      { id: 'supply', label: '补料' },
      { id: 'capabilities', label: '能力' },
      { id: 'models', label: '模型' },
    ]

    function tabsSummary(tab, s) {
      if (!s) return ''
      if (tab === 'capabilities') {
        var t = (s.capabilities && s.capabilities.totals) || {}
        var sk = (s.skills && s.skills.totals) || {}
        return '工具 ' + num(t.kept) + '/' + num(t.total)
          + ' · ' + tok(t.keptTokens) + ' token'
          + '　技能 ' + num(sk.count)
      }
      if (tab === 'knowledge') {
        var k = s.knowledge || {}
        return '已固化 ' + num((k.committed || []).length)
          + ' · 暂存 ' + num((k.staged || []).length)
      }
      // 图谱页签的摘要用 /api/state 里已有的数字（knowledge 计数），
      // 不为页签头的这一行字去多打一条建图请求。
      if (tab === 'graph') {
        var kg = s.knowledge || {}
        return '已固化 ' + num((kg.committed || []).length)
          + ' · 暂存 ' + num((kg.staged || []).length) + '（打开页签后取图谱）'
      }
      if (tab === 'triage') {
        var tr = s.triage || {}
        return '回收站 ' + num(tr.trash) + ' · 已拒绝 ' + num(tr.rejected)
      }
      if (tab === 'supply') {
        var g = s.gaps || {}
        return '缺口 ' + num(g.total) + ' · 挣扎 ' + num((s.struggles || {}).total)
      }
      if (tab === 'models') {
        var lm = s.llm || {}
        var u = (lm.lastUsed && lm.lastUsed.distill) || null
        return (lm.mode === 'rotate' ? '轮换' : '单一')
          + ' · ' + num((lm.models || []).length) + ' 个候选'
          + (u ? '　上次 ' + u.provider + '/' + u.model : '')
      }
      // ★ 未知页签返回空，**不要**落到某个默认分支上。
      //   原来这里直接 return 补料的数字，于是新加的"分拣"页签头上会写着
      //   "缺口 8 · 挣扎 50" —— 一个自信地显示错误数字的界面比空着更糟。
      return ''
    }

    // ── 二级界面（spec 05 重绘）：目录导航 + 观点句标题 + KPI 数字带 ──────
    //
    // 骨架 = 设计稿 B（左目录、红高亮、mono 编号）+ A（观点句大标题、
    // KPI 红大数字 + 黑小单位）。全部纯函数，离线可断言。

    /** 目录分组：导航项仍取 TABS 的 id/label，分组只是展示层。
     *  图谱是首页（用户指定）：KNOWLEDGE 组以图谱打头。 */
    var NAVGROUPS = [
      { grp: 'KNOWLEDGE', ids: ['graph', 'knowledge', 'triage'] },
      { grp: 'OPERATION', ids: ['supply', 'capabilities', 'models'] },
    ]

    /** 主题组：id 对应 CSS 里的 .lw-shell[data-theme=…]变量组。
     *  纯数据，导出可断言（每个 id 必须在 CSS 里有对应块）。 */
    var THEMES = [
      { id: 'default', label: '华为红' },
      { id: 'morandi', label: '莫兰迪' },
      { id: 'dark', label: '深色' },
    ]
    var THEME_KEY = 'lw-theme'
    function loadTheme() {
      try {
        var t = localStorage.getItem(THEME_KEY)
        return filterById(THEMES, t) ? t : 'default'
      } catch (e) { return 'default' }
    }
    function saveTheme(t) {
      try { localStorage.setItem(THEME_KEY, t) } catch (e) { /* 记不住不挡切换 */ }
    }

    var ROOT_API = '/aico-llm-wiki/api/switch-root'
    var BROWSE_API = '/aico-llm-wiki/api/browse-dirs'
    /** 取路径末段做显示名（兼容 \ 与 /）。 */
    function rootBaseName(p) {
      var s = String(p || '').replace(/[\\/]+$/, '')
      var i = Math.max(s.lastIndexOf('\\'), s.lastIndexOf('/'))
      return i >= 0 ? s.slice(i + 1) : s
    }
    /** 知识库切换：显示当前路径，「点击」弹出目录选择弹窗；不再手输路径。
     *  弹窗由服务端列目录（/api/browse-dirs），点选下钻、上一级回退，
     *  选定后 POST /api/switch-root 切换并刷新。 */
    function RootSwitch(props) {
      var root = (props.state && props.state.app && props.state.app.wikiRoot) || ''
      var editState = useState(false)
      var editing = editState[0], setEditing = editState[1]
      var busyState = useState(false)
      var busy = busyState[0], setBusy = busyState[1]
      var pick = function (p) {
        if (!p || busy) return
        setBusy(true)
        post(ROOT_API, { path: p }).then(function (r) {
          setBusy(false)
          if (r.j && r.j.ok) {
            toast('已切换知识库：' + (r.j.wikiRoot || p))
            setEditing(false)
            props.onChanged && props.onChanged()
          } else {
            toast('切换失败：' + ((r.j && r.j.error) || r.error || ('HTTP ' + r.status)), true)
          }
        })
      }
      if (!editing) {
        return h('button', {
          type: 'button',
          className: 'lw-rootswitch',
          title: root + '（点击更换知识库）',
          onClick: function () { setEditing(true) },
        },
          h('span', { className: 'lw-rootswitch-n' }, '库'),
          h('span', { className: 'lw-rootswitch-p' }, root || '连接中…'))
      }
      return h(RootPicker, {
        initial: root,
        busy: busy,
        onClose: function () { setEditing(false) },
        onPick: pick,
        onReset: function () {
          post(ROOT_API, { reset: true }).then(function (r) {
            if (r.j && r.j.ok) { toast('已恢复默认知识库'); setEditing(false); props.onChanged && props.onChanged() }
            else toast('恢复失败：' + ((r.j && r.j.error) || r.error), true)
          })
        },
      })
    }

    /** 目录选择弹窗：服务端只列子目录（跳过隐藏/系统目录），
     *  单击进入、上一级回退、到根后回盘符列表；全程没有可手输的路径框。 */
    function RootPicker(props) {
      var curState = useState(props.initial || '')
      var cur = curState[0], setCur = curState[1]
      var parentState = useState(undefined)
      var parent = parentState[0], setParent = parentState[1]
      var listState = useState(null)
      var list = listState[0], setList = listState[1]
      var errState = useState(null)
      var err = errState[0], setErr = errState[1]
      var load = useCallback(function (p) {
        getJson(BROWSE_API + '?path=' + encodeURIComponent(p || '')).then(function (r) {
          if (r.j && r.j.ok) {
            setCur(r.j.path || '')
            setParent(r.j.parent === undefined ? null : r.j.parent)
            setList(r.j.dirs || [])
            setErr(null)
          } else {
            setErr((r.j && r.j.error) || r.error || ('HTTP ' + r.status))
            setList([])
          }
        })
      }, [])
      useEffect(function () { load(props.initial || '') }, [load, props.initial])
      return h('div', {
        className: 'lw-mask',
        onClick: function (e) { if (e.target === e.currentTarget) props.onClose() },
      },
        h('div', {
          className: 'lw-rootpicker', role: 'dialog', 'aria-modal': 'true',
          'aria-label': '选择知识库目录', tabIndex: -1,
          onKeyDown: function (e) { if (e.key === 'Escape') props.onClose() },
        },
          h('div', { className: 'lw-rootpicker-head' },
            h('span', null, '选择知识库目录'),
            h('button', { type: 'button', className: 'lw-mini', title: '关闭', onClick: props.onClose }, '×')),
          h('div', { className: 'lw-rootpicker-path', title: cur }, cur || '此电脑（选择盘符进入）'),
          err ? h('div', { className: 'lw-rootpicker-err' }, err) : null,
          h('div', { className: 'lw-rootpicker-list' },
            list === null
              ? h('div', { className: 'lw-rootpicker-empty' }, '读取中…')
              : list.length === 0
                ? h('div', { className: 'lw-rootpicker-empty' }, '此目录下没有子目录')
                : list.map(function (d) {
                  return h('button', {
                    key: d, type: 'button', className: 'lw-rootpicker-item',
                    title: d,
                    onClick: function () { load(d) },
                  }, rootBaseName(d))
                })),
          h('div', { className: 'lw-rootpicker-acts' },
            h('button', {
              type: 'button', className: 'lw-mini',
              disabled: !cur || parent === null || parent === undefined,
              onClick: function () { load(parent) },
            }, '上一级'),
            h('button', { type: 'button', className: 'lw-mini', title: '清除切换记录，恢复宿主配置的默认库', onClick: props.onReset }, '恢复默认'),
            h('span', { className: 'lw-rootpicker-sp' }),
            h('button', { type: 'button', className: 'lw-mini', onClick: props.onClose }, '取消'),
            h('button', {
              type: 'button', className: 'lw-mini lw-rootpicker-ok',
              disabled: !cur || props.busy,
              title: cur ? '把知识库切到 ' + cur : '先进入一个目录',
              onClick: function () { props.onPick(cur) },
            }, props.busy ? '切换中…' : '选择此目录'))))
    }

    /** 导航徽标：只给「有待办」的页——数字说有事，导航就该带计数。 */
    function navBadge(tab, s) {
      if (!s) return 0
      if (tab === 'knowledge') return ((s.knowledge && s.knowledge.staged) || []).length
      if (tab === 'triage') { var tr = s.triage || {}; return num0(tr.trash) + num0(tr.rejected) }
      if (tab === 'supply') return num0(s.gaps && s.gaps.total)
      return 0
    }
    function num0(v) { return (v === undefined || v === null) ? 0 : Number(v) || 0 }

    /** 观点句标题（huawei-style 句式：判断句 + 数字红黑混排）。
     *  返回段数组 [{t,red}]，渲染时红段着色——数字必大必变色。 */
    function titleParts(tab, s) {
      var k = (s && s.knowledge) || {}
      var c = (k.committed || []).length, st = (k.staged || []).length
      var hits = (k.committed || []).reduce(function (n, p) { return n + num0(p.hits) }, 0)
      var conf = (k.committed || []).reduce(function (n, p) { return n + num0(p.confirmed) }, 0)
      if (tab === 'capabilities') {
        var t = (s && s.capabilities && s.capabilities.totals) || {}
        var sk = (s && s.skills && s.skills.totals) || {}
        return [{ t: '常驻成本已量化：' }, { t: num0(t.kept) + '/' + num0(t.total), red: true },
          { t: ' 个工具 · ' + num0(t.keptTokens) + ' token · ' + num0(sk.count) + ' 个技能' }]
      }
      if (tab === 'knowledge') {
        return [{ t: '知识库已沉淀 ' }, { t: c, red: true }, { t: ' 条知识，' },
          { t: st, red: st > 0 }, { t: ' 条待固化，全部可溯源' }]
      }
      if (tab === 'graph') {
        return [{ t: '知识结构可视化：' }, { t: c, red: true }, { t: ' 页入图，' },
          { t: hits, red: false }, { t: ' 次累计命中驱动节点大小' }]
      }
      if (tab === 'triage') {
        var tr = (s && s.triage) || {}
        return [{ t: '回收站与拒绝区：' }, { t: num0(tr.trash) + num0(tr.rejected), red: true }, { t: ' 条待分拣' }]
      }
      if (tab === 'supply') {
        var g = (s && s.gaps) || {}
        var sg = (s && s.struggles) || {}
        return [{ t: '学习回路运行中：' }, { t: num0(g.total), red: true },
          { t: ' 个缺口 · ' + num0(sg.total) + ' 条挣扎信号' }]
      }
      if (tab === 'models') {
        var lm = (s && s.llm) || {}
        return [{ t: '模型路由 ' }, { t: lm.mode === 'rotate' ? '轮换' : '单一', red: true },
          { t: '：' + num0((lm.models || []).length) + ' 个候选' }]
      }
      // 未知页签：中性兜底，不给可能出错的数字。
      return [{ t: 'aico-wiki' }]
    }

    /** KPI 数字带条目：**复用原 repo 的状态设计**（CLS 表 + StateDot）。
     *  每项带 {n, label, state}——state 直接喂 Dot()，与知识页签里
     *  同一状态的点/字色完全一致：一个状态在任何视图里长得一样。
     *  filter 是点击这一格后知识页签要套的 KFILTERS 档（null=只切过去）。 */
    function kpiItems(s) {
      var k = (s && s.knowledge) || {}
      var counts = k.counts || {}
      var committed = (k.committed || []).length
      // 未确认按 KFILTERS 语义并入新页；疑似有害与观察中并成「有反证」
      // （warn 点）——KPI 带要的是「该关注什么」，细分档位留给知识页签。
      return [
        { n: committed, label: '已固化', state: null, numCls: 'r', filter: 'all' },
        { n: (k.staged || []).length, label: '待固化', state: null, numCls: 'r', filter: null },
        { n: num0(counts.confirmed), label: CLS.confirmed.label, state: CLS.confirmed.state, numCls: '', filter: 'confirmed' },
        { n: num0(counts.unconfirmed) + num0(counts.new), label: CLS.unconfirmed.label, state: CLS.unconfirmed.state, numCls: '', filter: 'unconfirmed' },
        { n: num0(counts.suspect) + num0(counts['suspect-watch']), label: '有反证', state: 'error', numCls: '', filter: 'suspect' },
        { n: num0(counts.dead), label: CLS.dead.label, state: CLS.dead.state, numCls: '', filter: null },
      ]
    }

    function PanelBody(props) {
      // 受控模式：调用方直接给 state（离线渲染与截图用）。
      // 不给就照旧自己拉 —— 那条路径才是桌面里真正跑的。
      var controlled = !!(props && props.state)
      var tabState = useState((props && props.initialTab) || 'graph')
      var tab = tabState[0], setTab = tabState[1]
      var stState = useState(controlled ? props.state : null)
      var state = controlled ? props.state : stState[0]
      var setState = stState[1]
      var errState = useState(null)
      var err = errState[0], setErr = errState[1]
      // 图谱 → 知识页签的跳转载荷：存要展开的页面 id。
      // 跳转是"切页签 + 展开那一行"两件事，共用一个 state 才不会只做了一半。
      var focusState = useState(null)
      var focusId = focusState[0], setFocusId = focusState[1]
      var onInspect = useCallback(function (id) {
        setFocusId(id)
        setTab('knowledge')
      }, [setTab])
      // 反向载荷：知识目录树 → 图谱定位（选中节点并展开抽屉）。
      var focusNodeState = useState(null)
      var focusNode = focusNodeState[0], setFocusNode = focusNodeState[1]
      var onGotoGraph = useCallback(function (id) {
        setFocusNode(id)
        setTab('graph')
      }, [setTab])
      // KPI 带 → 知识页签的过滤载荷：filter 是 KFILTERS 档，nonce 让
      // 「连点同一格」也能把用户手动改过的筛选重置回这一档——
      // 否则第二次点击因 prop 未变而被 effect 忽略，看起来像坏了。
      var kpiJumpState = useState(null)
      var kpiJump = kpiJumpState[0], setKpiJump = kpiJumpState[1]
      var onKpiJump = useCallback(function (f) {
        setKpiJump({ filter: f, nonce: (kpiJump && kpiJump.nonce || 0) + 1 })
        setTab('knowledge')
      }, [kpiJump, setTab])
      // 主题：选择挂在 .lw-shell 的 data-theme 上（变量组在 CSS 顶部），
      // 偏好记 localStorage —— 下次打开还是上次选的皮肤。
      var themeState = useState(loadTheme)
      var theme = themeState[0], setTheme = themeState[1]
      var onTheme = useCallback(function (t) {
        setTheme(t); saveTheme(t)
      }, [setTheme])

      var load = useCallback(function () {
        // 受控模式不发请求：离线渲染里没有 fetch，也不该去打扰真实端点。
        if (controlled) return
        getJson(API)
          .then(function (r) {
            if (!r.j || !r.j.ok) throw new Error(r.error || (r.j && r.j.error) || ('HTTP ' + r.status))
            setState(r.j); setErr(null)
          })
          .catch(function (e) { setErr(String((e && e.message) || e)) })
      }, [controlled])

      useEffect(function () {
        if (controlled) return
        load()
        // 只在可见时轮询：后台窗口每 8 秒打一次接口没有意义。
        var t = setInterval(function () {
          if (typeof document === 'undefined' || document.visibilityState !== 'hidden') load()
        }, 8000)
        return function () { clearInterval(t) }
      }, [load, controlled])

      // ── 二级界面骨架（spec 05 重绘）：左目录 + 右内容（观点句 + KPI 带 + 页签体）──
      var navItem = function (t) {
        var badge = navBadge(t.id, state)
        return h('button', {
          key: t.id,
          type: 'button',
          className: 'lw-nav-item' + (tab === t.id ? ' cur' : ''),
          role: 'tab',
          'aria-selected': tab === t.id,
          tabIndex: tab === t.id ? 0 : -1,
          onClick: function () { setTab(t.id) },
        },
          h('span', { className: 'lw-nav-n' }, t.no),
          h('span', { className: 'lw-nav-l' }, t.label),
          badge > 0 ? h('span', { className: 'lw-nav-badge' }, num(badge)) : null
        )
      }
      var tabNo = {}
      for (var ti = 0; ti < TABS.length; ti++) tabNo[TABS[ti].id] = ('0' + (ti + 1)).slice(-2)

      return h('div', { className: 'lw-shell', 'data-theme': theme },
        h('div', { className: 'lw-head' },
          h('span', { className: 'lw-headicon' }, Ico('IconSkillOutline16', 16)),
          h('span', { className: 'lw-title' }, 'aico-wiki')
        ),
        h('div', { className: 'lw-work' },
          h('nav', {
            className: 'lw-nav',
            'aria-label': 'aico-wiki 导航',
            onKeyDown: tabKeys(TABS.map(function (t) { return t.id }), tab, setTab),
          },
            NAVGROUPS.map(function (g) {
              return h('div', { key: g.grp, className: 'lw-nav-grpwrap' },
                h('div', { className: 'lw-nav-grp' }, g.grp),
                g.ids.map(function (id) {
                  var t = TABS.filter(function (x) { return x.id === id })[0]
                  return t ? navItem({ id: t.id, label: t.label, no: tabNo[t.id] }) : null
                })
              )
            }),
            // 侧边栏底部的三件套：主题选择 / 换库入口 / 知识库路径。
            h('div', { className: 'lw-sidebottom' },
              h('div', { className: 'lw-siderow' },
                h('span', { className: 'lw-sidelabel' }, '主题'),
                h('select', {
                  className: 'lw-sel',
                  value: theme,
                  'aria-label': '界面主题',
                  onChange: function (e) { onTheme(e.target.value) },
                }, THEMES.map(function (t) {
                  return h('option', { key: t.id, value: t.id }, t.label)
                }))),
              h(RootSwitch, { state: state, onChanged: load }),
              h('div', {
                className: 'lw-sidepath',
                title: (state && state.app && state.app.wikiRoot) || '',
              }, (state && state.app && state.app.wikiRoot) || (state ? '（没有 wikiRoot）' : '连接中…'))
            )
          ),
          h('div', { className: 'lw-main' },
            // 面包屑：导航分组 / 当前页（观点句标题已承担「这页说什么」，
            // 面包屑只负责「我在哪」——长导航里的定位三件套之一）。
            h('div', { className: 'lw-crumb' },
              (NAVGROUPS.filter(function (g) { return g.ids.indexOf(tab) >= 0 })[0] || {}).grp,
              ' / ', h('b', null, (TABS.filter(function (x) { return x.id === tab })[0] || {}).label)),
            h('h3', { className: 'lw-h3' },
              titleParts(tab, state).map(function (p, i) {
                return h('span', { key: i, className: p.red ? 'r' : undefined }, p.t)
              })),
            state ? h('div', { className: 'lw-kpirow' },
              kpiItems(state).map(function (it, i) {
                // KPI 格可点：点哪一档，知识页签就按那一档筛好。
                var clickable = !!state.knowledge
                return h('button', {
                  key: i,
                  type: 'button',
                  className: 'lw-kpi lw-kpi-btn',
                  title: clickable ? ('点击查看' + it.label + (it.filter ? '（筛选后）' : '')) : undefined,
                  onClick: clickable ? function () { onKpiJump(it.filter) } : undefined,
                },
                  h('div', { className: 'lw-kpi-n ' + (it.numCls || '') },
                    it.state ? h(Dot, { state: it.state }) : null,
                    h('span', null, num(it.n))),
                  h('div', { className: 'lw-kpi-l' }, it.label))
              })
            ) : null,
            h('div', { className: 'lw-body lw-scroll' },
              err
                ? h('div', { className: 'lw-msg err' }, '读不到状态：' + err + '　（/aico-llm-wiki/api/state）')
                : !state
                  ? h('div', { className: 'lw-empty' }, '读取中…')
                  : tab === 'capabilities'
                    ? h(CapabilitiesTab, { state: state, onChanged: load, initialSeg: props.initialSeg })
                    : tab === 'knowledge' ? h(KnowledgeTab, { state: state, onChanged: load, focusId: focusId, onGotoGraph: onGotoGraph, kpiJump: kpiJump })
                      : tab === 'graph' ? h(GraphTab, { state: state, onChanged: load, onInspect: onInspect, focusNode: focusNode })
                        : tab === 'triage' ? h(TriageTab, { onChanged: load })
                          : tab === 'models' ? h(ModelsTab, { state: state, onChanged: load })
                            : h(SupplyTab, { state: state, onChanged: load })
            )
          )
        )
      )
    }

    /**
     * 面板外壳：自绘遮罩 + 自绘面板。
     *
     * 为什么不用 DSH 的 Modal 原语：它的 .dialog 写死 width:min(380px,100%)，
     * 是 RiskConfirmation 那一档确认框的尺寸。这张表要 1040px。硬覆盖它的
     * 宽度就得靠注入样式的先后顺序压过 CSS module，脆得很——不如各用各的。
     * 但面板内部一切控件仍用原语，所以看起来依然是 DSH 的一部分。
     */
    function Workbench(props) {
      ensureStyle()
      var ref = useRef(null)
      // 开着的时候把焦点收进来，关掉还回去——否则键盘用户会掉在页面的某个角落。
      useEffect(function () {
        var prev = document.activeElement
        try { ref.current && ref.current.focus && ref.current.focus() } catch (e) {}
        return function () { try { prev && prev.focus && prev.focus() } catch (e) {} }
      }, [])

      /**
       * 焦点圈：Tab 不许跑出这个面板。
       *
       * 之前只做了"进门时聚焦 + Esc 关闭"，Tab 仍能把焦点带到面板**背后**
       * 的聊天界面上去——那时面板还盖着屏幕，键盘用户却已经在对着看不见的
       * 控件按空格了。aria-modal="true" 是对读屏的承诺，这个循环是对键盘的兑现。
       * 承诺和兑现得是同一件事。
       */
      var onKeyDown = function (e) {
        if (e.key !== 'Tab') return
        var root = ref.current
        if (!root || typeof root.querySelectorAll !== 'function') return
        var sel = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),'
          + 'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
        var nodes = []
        try { nodes = Array.prototype.slice.call(root.querySelectorAll(sel)) } catch (err) { return }
        // 滤掉不可见的（display:none 的元素 offsetParent 为 null）
        nodes = nodes.filter(function (n) { return n.offsetParent !== null })
        if (nodes.length === 0) { e.preventDefault(); try { root.focus() } catch (err) {} ; return }
        var first = nodes[0]
        var last = nodes[nodes.length - 1]
        var active = document.activeElement
        if (e.shiftKey && (active === first || active === root)) {
          e.preventDefault()
          try { last.focus() } catch (err) {}
        } else if (!e.shiftKey && active === last) {
          e.preventDefault()
          try { first.focus() } catch (err) {}
        }
      }

      return h('div', {
        className: 'lw-mask',
        onClick: function (e) { if (e.target === e.currentTarget) props.onClose() },
      }, h('div', {
        onKeyDown: onKeyDown,
        className: 'lw-panel lw-root',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'aico-wiki',
        tabIndex: -1,
        ref: ref,
        // state / initialTab / initialSeg 透传给 PanelBody：
        // 离线截图要画的是**这个外壳**里带数据的真实内容，
        // 而不是另搭一个长得像的壳。桌面运行时这几个 prop 都不存在，
        // 走的就是"自己拉数据"那条路。
        // ★ 三个 prop 都要**无条件**传下去。原来写成"受控才传"，
        //   而桌面运行时 props.state 是空的 —— 于是 initialTab 被静默丢掉，
        //   提示条点「处理」想跳到知识页签会跳到默认页签，看起来像没反应。
        //   PanelBody 自己用 state 是否存在来判断受控，不需要这里替它挡。
      }, h(PanelBody, {
        state: props.state,
        initialTab: props.initialTab,
        initialSeg: props.initialSeg,
      })))
    }

    /**
     * 分拣页签：回收站 / 已拒绝里的条目，逐条决定「恢复」还是「永久删除」。
     *
     * 这一页是补一个**我自己造出来的死胡同**：待办条上写着"12 个待分拣"，
     * 但面板里原先根本没有能处理它们的界面 —— 数字说有事，点进去没事。
     *
     * 两条设计铁律：
     *   1. 恢复**回 staged/**，绝不直接进 pages/。两段式的第一段是防投毒闸门，
     *      "从回收站捞回来"不该成为绕过它的后门。
     *   2. 永久删除是**不可逆**的，所以两段确认；服务端另有一道 confirm 守卫
     *      （前端这道是给人看的，服务端那道才是真的闸）。
     */
// ── 模块：components/triage ───────────────────────────────────────
// 分拣页签：TriageTab。
    function TriageTab(props) {
      ensureStyle()
      // 受控模式（离线渲染/截图）直接给 items，与 PanelBody / PendingBar 同一套惯例。
      var controlled = !!(props && props.items)
      var listState = useState(controlled ? props.items : null)
      var items = controlled ? props.items : listState[0]
      var setItems = listState[1]
      var errState = useState(null)
      var err = errState[0], setErr = errState[1]
      var segState = useState('all')
      var seg = segState[0], setSeg = segState[1]
      var openState = useState(null)
      var open = openState[0], setOpen = openState[1]
      var bodyState = useState({})
      var bodies = bodyState[0], setBodies = bodyState[1]
      var askState = useState(null)
      var ask = askState[0], setAsk = askState[1]
      var busyState = useState(null)
      var busy = busyState[0], setBusy = busyState[1]
      var msgState = useState(null)
      var msg = msgState[0], setMsg = msgState[1]

      var load = useCallback(function () {
        if (controlled) return
        getJson(TRIAGE_API).then(function (r) {
          if (r.j && r.j.ok) { setItems(r.j.items || []); setErr(null) }
          else setErr(r.error || (r.j && r.j.error) || ('HTTP ' + r.status))
        }).catch(function (e) { setErr(String((e && e.message) || e)) })
      }, [controlled])
      useEffect(function () { load() }, [load])

      var loadBody = function (rel) {
        setBodies(function (b) {
          if (b[rel]) return b
          var n = Object.assign({}, b); n[rel] = { loading: true }; return n
        })
        getJson(TRIAGE_API + '?rel=' + encodeURIComponent(rel)).then(function (r) {
          setBodies(function (b) {
            var n = Object.assign({}, b)
            n[rel] = (r.j && r.j.ok) ? { body: r.j.body } : { error: r.error || (r.j && r.j.error) || ('HTTP ' + r.status) }
            return n
          })
        }).catch(function (e) {
          setBodies(function (b) {
            var n = Object.assign({}, b); n[rel] = { error: String((e && e.message) || e) }; return n
          })
        })
      }

      var onToggle = function (rel) {
        var next = open === rel ? null : rel
        setOpen(next)
        if (next) loadBody(next)
      }

      var act = function (rel, action) {
        setBusy(rel); setMsg(null)
        // 不做乐观移除：恢复/删除都是本地文件操作，快到不需要它；
        // 而"先把它从列表里拿掉、失败再放回去"会让人看到条目闪一下，
        // 那种闪动本身就在传递"可能没成"的不确定感。
        var payload = action === 'discard' ? { rel: rel, action: action, confirm: true } : { rel: rel, action: action }
        post(TRIAGE_API, payload).then(function (r) {
          setBusy(null); setAsk(null)
          if (r.j && r.j.ok) {
            setMsg({
              ok: true,
              text: action === 'restore'
                ? '已恢复到 staged/ —— 它仍要过一遍固化闸门才会进召回。'
                : '已永久删除。',
            })
            setItems(function (l) { return (l || []).filter(function (x) { return x.rel !== rel }) })
            props.onChanged && props.onChanged()
          } else {
            setMsg({ ok: false, text: (r.error || (r.j && r.j.error) || ('HTTP ' + r.status)) })
          }
        }).catch(function (e) {
          setBusy(null); setAsk(null)
          setMsg({ ok: false, text: String((e && e.message) || e) })
        })
      }

      if (err) return h('div', { className: 'lw-msg err' }, '读不到分拣列表：' + err + '　（/aico-llm-wiki/api/triage）')
      if (!items) return h('div', { className: 'lw-empty' }, '读取中…')

      var inTrash = items.filter(function (x) { return x.from === '.trash' }).length
      var inRej = items.filter(function (x) { return x.from === '.rejected' }).length
      var SEGS = [
        { id: 'all', label: '全部', n: items.length },
        { id: '.trash', label: '回收站', n: inTrash },
        { id: '.rejected', label: '已拒绝', n: inRej },
      ]
      var shown = seg === 'all' ? items : items.filter(function (x) { return x.from === seg })

      return h('div', null,
        h('div', { className: 'lw-seg', role: 'tablist', 'aria-label': '分拣筛选' },
          SEGS.map(function (s) {
            return h(Chip, {
              key: s.id, active: seg === s.id, role: 'tab', 'aria-selected': seg === s.id,
              onClick: function () { setSeg(s.id) },
            }, s.label + ' ' + s.n)
          })
        ),
        // 说清楚"恢复"到底恢复到哪里。用户以为是"还原成已固化"，
        // 实际是"回到待固化"—— 不写清楚，他会以为恢复之后立刻就生效了。
        h('div', { className: 'lw-hint' },
          '恢复 = 放回 staged/，仍要过固化闸门才会参与召回；永久删除不可撤销。'),
        msg ? h('div', { className: 'lw-msg ' + (msg.ok ? 'ok' : 'err') }, msg.text) : null,
        shown.length === 0
          ? h('div', { className: 'lw-empty' }, '这一类里没有条目。')
          : h('div', { className: 'lw-tri' },
              shown.map(function (it) {
                var isOpen = open === it.rel
                var b = bodies[it.rel]
                var confirming = ask === it.rel
                var isBusy = busy === it.rel
                return h('div', { key: it.rel, className: 'lw-tri-card' },
                  h('div', { className: 'lw-tri-head' },
                    h('span', {
                      className: 'lw-tri-tag ' + (it.from === '.rejected' ? 'rej' : 'tra'),
                    }, it.from === '.trash' ? '回收站' : '已拒绝'),
                    h('span', { className: 'lw-tri-title' }, it.title || it.id),
                    h('span', { className: 'lw-tri-meta' },
                      it.id
                      + (it.category ? ' · ' + it.category : '')
                      + (it.confidence != null ? ' · ' + it.confidence : '')
                      + ' · ' + it.sources + ' 来源 · ' + it.bodyChars + ' 字'
                      + (it.batch ? ' · 批次 ' + String(it.batch).replace(/^staged-/, '') : ''))
                  ),
                  // ── 为什么它在这 ──
                  //
                  // 解析不出来就**如实说没记录**，绝不编一个。编出来的理由会被
                  // 后来的人当成证据 —— 那比"没有理由"危险得多。
                  it.reason
                    ? h('div', { className: 'lw-tri-why' },
                        h('span', { className: 'k' },
                          (it.reason.kind === 'TRASHED' ? '回收原因' : '拒绝原因')
                          + (it.reason.date ? ' · ' + it.reason.date : '')),
                        it.reason.text)
                    : h('div', { className: 'lw-tri-why none' },
                        h('span', { className: 'k' }, '未记录原因'),
                        '移进来时没写理由。约定见 ' + it.from + '/README.md —— 没有理由，就只能靠读全文决定要不要它。'),
                  h('div', { className: 'lw-tri-exc' }, b && b.body != null ? b.body : it.excerpt),
                  h('div', { className: 'lw-tri-acts' },
                    h('button', { type: 'button', className: 'lw-tri-more', onClick: function () { onToggle(it.rel) } },
                      isOpen ? '收起全文' : '读全文'),
                    h('button', {
                      type: 'button', className: 'lw-btn', disabled: isBusy,
                      onClick: function () { act(it.rel, 'restore') },
                    }, '恢复'),
                    confirming
                      ? h('button', {
                          type: 'button', className: 'lw-btn primary', disabled: isBusy,
                          onClick: function () { act(it.rel, 'discard') },
                        }, isBusy ? '删除中…' : '确认永久删除')
                      : h('button', {
                          type: 'button', className: 'lw-btn',
                          onClick: function () { setAsk(it.rel) },
                        }, '永久删除'),
                    confirming
                      ? h('button', {
                          type: 'button', className: 'lw-btn', disabled: isBusy,
                          onClick: function () { setAsk(null) },
                        }, '取消')
                      : null,
                    confirming ? h('span', { className: 'lw-tri-ask' }, '删了就找不回来了。') : null
                  )
                )
              })
            )
      )
    }
