// ═══ 06-knowledge.js · 知识页签组件：可展开活行表格 + 暂存区 ═══
// （源码文件，编辑后运行 pnpm run build:client 合成 client/client.js）
// ── 模块：components/knowledge ────────────────────────────────────
// 知识页签：筛选档/视图纯函数 + KnowledgeTab/KbTree/KbTreeNode/PageDetail，
// 以及溯源 chips（SourceChips）与占比条（BarRow）。
// （纯函数在 04-view-logic.js；SourceChips/BarRow 在 03-utils.js。）

    // ── 知识：可展开的活行 ────────────────────────────────────────────────
    function KnowledgeTab(props) {
      var k = props.state.knowledge || {}
      var committed = k.committed || []
      var staged = k.staged || []
      var openState = useState(null)
      var open = openState[0], setOpen = openState[1]
      var pagesState = useState({})
      var pages = pagesState[0], setPages = pagesState[1]
      var msgState = useState(null)
      var msg = msgState[0], setMsg = msgState[1]
      var busyState = useState(null)
      var busy = busyState[0], setBusy = busyState[1]
      var kfState = useState('all')
      var kFilter = kfState[0], setKFilter = kfState[1]
      // KPI 带跳转进来的过滤载荷：nonce 在才动作——没有 nonce 的载荷
      // （首次挂载、其它入口跳入）不该动用户自己选的筛选。
      var seenJumpState = useState(null)
      var seenJump = seenJumpState[0]
      useEffect(function () {
        var j = props.kpiJump
        if (!j || j === seenJump) return
        seenJumpState[1](j)
        if (j.filter && filterById(KFILTERS, j.filter)) setKFilter(j.filter)
      }, [props.kpiJump, seenJump])

      // 图谱跳转进来的载荷：展开并取正文。focusId 变 null 不动作——
      // 「没有要展开的」不是「把已展开的收起来」，别把两件事搅在一起。
      useEffect(function () {
        if (!props.focusId) return
        setOpen(props.focusId)
        loadPage(props.focusId)
      }, [props.focusId])

      var loadPage = useCallback(function (id) {
        setPages(function (p) {
          if (p[id]) return p
          var next = Object.assign({}, p)
          next[id] = { loading: true }
          return next
        })
        getJson(PAGE_API + '?id=' + encodeURIComponent(id))
          .then(function (r) {
            setPages(function (p) {
              var next = Object.assign({}, p)
              next[id] = (r.j && r.j.ok) ? { data: r.j } : { error: r.error || (r.j && r.j.error) || ('HTTP ' + r.status) }
              return next
            })
          })
          .catch(function (e) {
            setPages(function (p) {
              var next = Object.assign({}, p)
              next[id] = { error: String((e && e.message) || e) }
              return next
            })
          })
      }, [])

      var onRow = function (id) {
        var next = open === id ? null : id
        setOpen(next)
        if (next) loadPage(next)
      }

      // 乐观：点过"固化"就立刻把这条摆进「已固化」，标成"固化中…"。
      //
      // 固化要写文件再删 staged 文件，是这几处里最慢的一步；等它回来才动界面，
      // 感觉就像按钮没反应。所以先动界面 —— 但**不假装它已经完成**：
      // 它带着"固化中…"标记躺在表里，真值一到就换成真正的证据分类。
      // 失败则退回暂存并说明，不留一条假的已固化记录。
      var pendState = useState([])
      var pend = pendState[0], setPend = pendState[1]
      var dropPend = function (id) {
        setPend(function (l) { return l.filter(function (x) { return x !== id }) })
      }
      var commit = function (id) {
        setBusy(id)
        setPend(function (l) { return l.indexOf(id) >= 0 ? l : l.concat([id]) })
        post('/aico-llm-wiki/api/commit', { id: id })
          .then(function (r) {
            setBusy(null)
            if (r.j && r.j.ok) { setMsg({ ok: true, text: '已固化 ' + id }); props.onChanged && props.onChanged() }
            else { dropPend(id); setMsg({ ok: false, text: '固化失败，已退回暂存：' + (r.error || (r.j && r.j.error) || r.status) }) }
          })
          .catch(function (e) { setBusy(null); dropPend(id); setMsg({ ok: false, text: '固化失败，已退回暂存：' + String((e && e.message) || e) }) })
      }

      // 把"固化中"的乐观行拼进已固化列表。
      // 真值一到，它**自动**消失——靠的是这里取差集（id 已在 committed 里就跳过），
      // 而不是"记得在某处删掉它"。忘了删的清理代码是 bug 的温床。
      var committedIds = {}
      for (var ci = 0; ci < committed.length; ci++) committedIds[committed[ci].id] = true
      var pendingRows = []
      for (var pi = 0; pi < pend.length; pi++) {
        var pid = pend[pi]
        if (committedIds[pid]) continue
        var sp = null
        for (var si = 0; si < staged.length; si++) if (staged[si].id === pid) { sp = staged[si]; break }
        if (!sp) continue
        pendingRows.push({
          id: sp.id, title: sp.title, category: sp.category,
          cls: 'unconfirmed', hits: 0, confirmed: 0, suspect: 0,
          sources: sp.sources, srcs: sp.srcs, updated: null, created: null,
          quarantined: false, pending: true,
        })
      }
      var committedAll = committed.concat(pendingRows)
      var stagedShown = staged.filter(function (p) { return pend.indexOf(p.id) < 0 })

      // 已经出现在已固化里的 id 就从乐观集合里摘掉。
      // 摘不摘不影响上面那两条渲染（它们各自取差集），但会让 pend 无限长大 ——
      // 而一个永远不清理的集合，迟早会在某个没想到的地方咬人。
      useEffect(function () {
        setPend(function (l) {
          var keep = l.filter(function (id) { return !committedIds[id] })
          return keep.length === l.length ? l : keep
        })
      }, [committed])

      // 排序/筛选的实现在 knowledgeView（纯函数，见文件上方）——
      // 这样"顺序稳不稳""筛选选得对不对"可以被离线断言，不必靠肉眼看界面。
      var view = useMemo(function () { return knowledgeView(committedAll, kFilter) }, [committedAll, kFilter])
      var sorted = view.sorted
      var shown = view.shown
      var activeFilter = view.filter
      var counts = k.counts || {}
      var countOf = function (f) { return committedAll.filter(f.test).length }

      // 目录树（spec 06 修订）：像本地目录一样浏览知识库，点击打开详情、
      // 可一键跳图谱定位。树数据来自 /api/tree（独立端点，低频，只取一次）。
      var treeState = useState(null)
      var tree = treeState[0], setTree = treeState[1]
      var loadTree = useCallback(function () {
        getJson('/aico-llm-wiki/api/tree')
          .then(function (r) {
            if (r.j && r.j.ok) setTree(r.j.tree || {})
          })
          .catch(function () { /* 树是导航增强，读不到不挡表格 */ })
      }, [])
      useEffect(function () { loadTree() }, [loadTree])

      return h('div', { className: 'lw-kn' },
        h(KbTree, {
          tree: tree,
          onOpen: function (id) { setOpen(id); loadPage(id) },
          onGoto: props.onGotoGraph,
        }),
        h('div', { className: 'lw-kn-main' },
        h('div', { className: 'lw-sec' },
          h('div', { className: 'lw-sec-h' },
            h('span', { className: 'lw-sec-t' }, '已固化'),
            h('span', { className: 'lw-sec-n' }, num(committedAll.length) + ' 条 · 按 id 稳定排序'),
            h('span', { className: 'lw-sec-n' },
              Object.keys(counts).map(function (c) { return clsInfo(c).label + ' ' + counts[c] }).join(' · '))
          ),
          msg ? h('div', { className: 'lw-msg ' + (msg.ok ? 'ok' : 'err') }, msg.text) : null,
          // 筛选器把"我该先看哪些"变成一次点击，而不是一次重排。
          // 数字直接标在胶囊上——否则你得先点进去才知道那一档是空的。
          committed.length ? h('div', { className: 'lw-bar' },
            KFILTERS.map(function (f) {
              return h(Chip, {
                key: f.id,
                active: kFilter === f.id,
                onClick: function () { setKFilter(f.id) },
              }, f.label + ' ' + num(countOf(f)))
            }),
            h('span', { className: 'lw-sec-n', style: { marginLeft: 'auto' } }, num(shown.length) + ' 行')
          ) : null,
          shown.length ? h('table', { className: 'lw-table' },
            h('colgroup', null,
              h('col', { style: { width: '26px' } }),
              h('col', null),
              h('col', { style: { width: '96px' } }),
              h('col', { style: { width: '150px' } }),
              h('col', { style: { width: '86px' } }),
              h('col', { style: { width: '58px' } }),
              h('col', { style: { width: '58px' } }),
              h('col', { style: { width: '58px' } })
            ),
            h('thead', null, h('tr', null,
              h('th', { className: 'lw-th' }, ''),
              h('th', { className: 'lw-th' }, '知识'),
              h('th', { className: 'lw-th' }, '证据'),
              h('th', { className: 'lw-th' }, '来源'),
              h('th', { className: 'lw-th' }, '更新'),
              h('th', { className: 'lw-th r' }, '命中'),
              h('th', { className: 'lw-th r' }, '证实'),
              h('th', { className: 'lw-th r' }, '反证')
            )),
            h('tbody', null, shown.map(function (p) {
              var isOpen = open === p.id
              var ci = clsInfo(p.cls)
              var pg = pages[p.id]
              return [
                h('tr', {
                  key: p.id, className: 'lw-tr x', 'aria-expanded': isOpen,
                  onClick: function () { onRow(p.id) },
                },
                  // 展开控件是一个**真的 button**，不是"给 tr 挂个 onClick"。
                  // 行上的 onClick 只服务鼠标；键盘用户需要的是一个能 Tab 到、
                  // 能按 Enter/Space 的焦点目标 —— tr 不是。aria-expanded 挂在
                  // 它身上，于是"这一行是展开的还是收起的"对读屏也是可读的。
                  h('td', { className: 'lw-td' },
                    h('button', {
                      type: 'button',
                      className: 'lw-chevbtn',
                      'aria-expanded': isOpen,
                      'aria-label': (isOpen ? '收起 ' : '展开 ') + (p.title || p.id),
                      onClick: function (e) { e.stopPropagation(); onRow(p.id) },
                    }, h(Chev, { open: isOpen }))),
                  h('td', { className: 'lw-td', title: p.title },
                    h('span', null, p.title || p.id),
                    p.quarantined ? h('span', { className: 'lw-chip c-bad', style: { marginLeft: '8px' } }, '已隔离') : null),
                  // 乐观行不冒充已分类的证据：它是一个明确的过渡态。
                  h('td', { className: 'lw-td' },
                    p.pending
                      ? h('span', {
                          className: 'lw-chip c-warn',
                          title: '已提交，等宿主写出文件并确认——不是已经生效',
                        }, '固化中…')
                      : h('span', { className: ci.cls, style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } },
                          h(Dot, { state: ci.state, size: 8 }), ci.label)),
                  // 溯源列（spec 06 修订）：会话 xxx / 文档 xxx / 链接 xxx，
                  // chips 短显 + title 全量；URL 可点开，会话/文档只读（title 看全）。
                  h('td', { className: 'lw-td' }, h(SourceChips, { sources: p.srcs })),
                  h('td', { className: 'lw-td' }, h('span', { className: 'lw-num' }, when(p.updated || p.created))),
                  h('td', { className: 'lw-td r' }, h('span', { className: 'lw-num' }, num(p.hits))),
                  h('td', { className: 'lw-td r' }, h('span', { className: 'lw-num c-ok' }, num(p.confirmed))),
                  h('td', { className: 'lw-td r' }, h('span', { className: 'lw-num' + (p.suspect > 0 ? ' c-bad' : '') }, num(p.suspect)))
                ),
                isOpen ? h('tr', { key: p.id + ':d' },
                  h('td', { className: 'lw-td detail', colSpan: 8 },
                    h('div', { className: 'lw-exp' }, h(PageDetail, { id: p.id, meta: p, page: pg, onRetry: function () { loadPage(p.id) } })))) : null
              ]
            }))
          ) : h('div', { className: 'lw-empty' },
            committedAll.length
              ? '当前筛选（' + activeFilter.label + '）下没有条目。' + num(committedAll.length) + ' 条已固化知识里没有符合这一档的——换个筛选看看。'
              : (stagedShown.length < staged.length
                  ? '正在固化——写文件完成后这条会出现在这里。'
                  : '还没有已固化的知识。'))
        ),
        h('div', { className: 'lw-sec' },
          h('div', { className: 'lw-sec-h' },
            h('span', { className: 'lw-sec-t' }, '暂存'),
            h('span', { className: 'lw-sec-n' }, num(stagedShown.length) + ' 条'),
            h('span', { className: 'lw-sec-n' }, '不参与自动召回，固化后才算数')
          ),
          stagedShown.length ? h('table', { className: 'lw-table' },
            h('colgroup', null,
              h('col', null),
              h('col', { style: { width: '92px' } }),
              h('col', { style: { width: '132px' } }),
              h('col', { style: { width: '96px' } })
            ),
            h('thead', null, h('tr', null,
              h('th', { className: 'lw-th' }, '知识'),
              h('th', { className: 'lw-th' }, '类别'),
              h('th', { className: 'lw-th' }, '缺口'),
              h('th', { className: 'lw-th r' }, '')
            )),
            h('tbody', null, stagedShown.map(function (p) {
              var blocked = (p.blockers || []).length > 0
              return h('tr', { key: p.id, className: 'lw-tr' },
                h('td', { className: 'lw-td', title: p.title },
                  h('span', null, p.title || p.id),
                  h('span', { className: 'lw-src', style: { marginLeft: '8px' } }, p.id)),
                h('td', { className: 'lw-td' }, h('span', { className: 'lw-num' }, p.category || '—')),
                h('td', { className: 'lw-td' },
                  blocked
                    ? h('span', { className: 'c-bad', title: (p.blockers || []).join('、') }, (p.blockers || [])[0])
                    : h('span', { className: 'c-3' }, (p.sources || 0) + ' 个来源')),
                h('td', { className: 'lw-td r' },
                  h(Btn, {
                    size: 'sm', variant: blocked ? 'ghost' : 'primary',
                    disabled: blocked || busy === p.id,
                    title: blocked ? '不满足固化条件：' + (p.blockers || []).join('、') : '升入已固化，开始参与召回',
                    onClick: function () { commit(p.id) },
                  }, busy === p.id ? '处理中' : '固化'))
              )
            }))
          ) : h('div', { className: 'lw-empty' }, '暂存区是空的。')
        )
        )
      )
    }

    /** 目录树：文件浏览器语义——文件夹可折叠、叶子=页面文件。
     *  打开（onOpen）= 在右侧表格展开该页详情；跳谱（onGoto）= 图谱定位。 */
    function KbTree(props) {
      var t = props.tree
      if (!t) return h('div', { className: 'lw-tree' },
        h('div', { className: 'lw-tree-h' }, '目录'),
        h('div', { className: 'lw-empty' }, '读取中…'))
      return h('div', { className: 'lw-tree lw-scroll' },
        h('div', { className: 'lw-tree-h' }, '目录', h('span', { className: 'lw-sec-n', style: { marginLeft: '6px' } }, 'llm-wiki')),
        h(KbTreeNode, { name: '', node: t, depth: 0, onOpen: props.onOpen, onGoto: props.onGoto })
      )
    }

    function KbTreeNode(props) {
      var node = props.node || {}
      var openState = useState(true)
      var open = openState[0], setOpen = openState[1]
      var keys = Object.keys(node)
      var folders = keys.filter(function (k) { return node[k] && !node[k].__leaf })
      var leaves = keys.filter(function (k) { return node[k] && node[k].__leaf })
      var pad = { paddingLeft: (6 + props.depth * 14) + 'px' }
      return h('div', { className: 'lw-tree-node' },
        // 文件夹行（本节点名；depth=0 是根，不显示）
        props.depth > 0 ? h('button', {
          type: 'button', className: 'lw-tree-dir', style: pad,
          onClick: function () { setOpen(!open) },
          'aria-expanded': open,
        },
          h(Chev, { open: open }),
          h('span', { className: 'lw-tree-name' }, props.name),
          h('span', { className: 'lw-sec-n' }, String(folders.length + leaves.length))
        ) : null,
        open || props.depth === 0 ? h('div', null,
          folders.map(function (k) {
            return h(KbTreeNode, { key: k, name: k, node: node[k], depth: props.depth + 1, onOpen: props.onOpen, onGoto: props.onGoto })
          }),
          leaves.map(function (k) {
            var leaf = node[k]
            return h('div', { key: k, className: 'lw-tree-leaf', style: { paddingLeft: (14 + props.depth * 14) + 'px' }, title: k },
              h('button', {
                type: 'button', className: 'lw-tree-file',
                onClick: function () { props.onOpen && props.onOpen(leaf.id) },
                title: '打开：' + (leaf.title || leaf.id),
              },
                h('span', { className: 'lw-tree-dot ' + (leaf.category || 'fact') }),
                h('span', { className: 'lw-tree-name' }, leaf.title || k)),
              props.onGoto ? h('button', {
                type: 'button', className: 'lw-tree-goto',
                title: '在图谱中定位', 'aria-label': '在图谱中定位 ' + (leaf.title || leaf.id),
                onClick: function () { props.onGoto(leaf.id) },
              }, '图') : null
            )
          })
        ) : null
      )
    }

    /** 展开行里的正文。按需取，取过就留着。 */
    function PageDetail(props) {
      var pg = props.page
      var m = props.meta || {}
      if (!pg || pg.loading) {
        return h('div', null, h('div', { className: 'lw-meta' }, h('span', null, '读取正文…')))
      }
      if (pg.error) {
        return h('div', null,
          h('div', { className: 'lw-meta' }, h('span', { className: 'c-bad' }, '读不到正文：' + pg.error)),
          h(Btn, { size: 'sm', onClick: props.onRetry }, '重试'))
      }
      var d = pg.data || {}
      var srcs = d.sources || []
      return h('div', null,
        h('div', { className: 'lw-meta' },
          h('span', { className: 'lw-id' }, d.id),
          h('span', null, d.category || '—'),
          d.confidence != null ? h('span', null, '置信 ' + d.confidence) : null,
          h('span', null, '创建 ' + String(d.created || '').slice(0, 10)),
          h('span', null, d.updated ? '更新 ' + String(d.updated).slice(0, 10) : null),
          h('span', null, '命中 ' + num(d.usage && d.usage.hits)
            + ' · 证实 ' + num(d.usage && d.usage.confirmed)
            + ' · 反证 ' + num(d.usage && d.usage.suspect)),
          m.factor != null ? h('span', null, '强化系数 x' + m.factor) : null
        ),
        h(Md, { text: d.body || '' }),
        // 溯源列表（spec 06 修订）：类型徽标（会话/文档/链接）+ 完整值。
        srcs.length ? h('ul', { className: 'lw-srclist' }, srcs.map(function (u, i) {
          var sk = sourceKind(u)
          return h('li', { key: i },
            h('span', { className: 'lw-srcchip lw-src-' + sk.kind }, sk.label),
            sk.kind === 'doc' && sk.docPath
              ? h('a', {
                  href: '#', title: sk.full + (sk.page ? '（点击打开并跳到第 ' + sk.page + ' 页）' : '（点击打开）'),
                  onClick: function (e) { e.preventDefault(); openDoc(sk) },
                }, sk.full)
              : sk.href
                ? h('a', { href: sk.href, target: '_blank', rel: 'noreferrer noopener', title: sk.full }, sk.full)
                : h('span', { className: 'lw-src', title: sk.full }, sk.full))
        })) : h('p', { className: 'lw-note c-bad' }, '这条知识没有来源。')
      )
    }