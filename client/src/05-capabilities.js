// ═══ 05-capabilities.js · 能力页签组件：工具 + 技能（常驻/触发成本两笔账） ═══
// （源码文件，编辑后运行 pnpm run build:client 合成 client/client.js）
// ── 模块：components/tools ────────────────────────────────────────
// 工具表：行序/分组/可见性纯函数 + ToolsSection。
// （纯函数部分在 04-view-logic.js。）

    // ── 能力：工具 + 技能 ─────────────────────────────────────────────────
    function ToolsSection(props) {
      // 折叠状态：族名 -> true 表示收起。用"记下被改过的那些"而不是记全部，
      // 因为默认规则是"只展开核心"，那是个规则不是一张表。
      var collapseState = useState({})
      var collapse = collapseState[0], setCollapse = collapseState[1]
      var cap = props.state.capabilities || {}
      var catalog = cap.catalog || {}
      var items = catalog.items || []
      var totals = cap.totals || {}
      var qState = useState('')
      var q = qState[0], setQ = qState[1]
      var busyState = useState(null)
      var busy = busyState[0], setBusy = busyState[1]
      var msgState = useState(null)
      var msg = msgState[0], setMsg = msgState[1]
      var filterState = useState('all')
      var filter = filterState[0], setFilter = filterState[1]
      // 乐观覆盖：name -> 期望的 denied。发请求**之前**就写进来，所以方框立刻翻。
      var optState = useState({})
      var opt = optState[0], setOpt = optState[1]

      var setOptKey = function (name, val) {
        setOpt(function (o) { var n = Object.assign({}, o); n[name] = val; return n })
      }
      var clearOptKey = function (name) {
        setOpt(function (o) {
          if (!Object.prototype.hasOwnProperty.call(o, name)) return o
          var n = Object.assign({}, o)
          delete n[name]
          return n
        })
      }

      // 勾选即写回 wiki.config.json。界面只动 explicitOnly 这一档，
      // diagnostics / deny 原样保留 —— 免得一次勾选把手工写好的精细配置冲掉。
      //
      // ★ 乐观更新：先把这一格翻过去，再发请求。
      //   之前是"等回来才翻"，于是每次点击的反馈延迟 = 一次网络往返。
      //   方向反过来之后：成功什么都不用做（轮询回来的真值与覆盖一致，
      //   覆盖由下面的 effect 自动撤销）；失败则撤销覆盖，并**说明这一格
      //   已经回滚** —— 不留一个骗人的勾。
      var toggle = function (name, keep) {
        var cur = (cap.configuredDeny || []).slice()
        var i = cur.indexOf(name)
        if (!keep && i < 0) cur.push(name)
        if (keep && i >= 0) cur.splice(i, 1)
        setBusy(name)
        setOptKey(name, !keep)
        post('/aico-llm-wiki/api/capabilities', { enabled: true, explicitOnly: cur })
          .then(function (r) {
            setBusy(null)
            if (r.j && r.j.ok) { setMsg({ ok: true, text: '已写入 wiki.config.json — 下一次会话装配时生效' }); props.onChanged && props.onChanged() }
            else { clearOptKey(name); setMsg({ ok: false, text: '保存失败，这一格已回滚：' + (r.error || (r.j && r.j.error) || r.status) }) }
          })
          .catch(function (e) { setBusy(null); clearOptKey(name); setMsg({ ok: false, text: '保存失败，这一格已回滚：' + String((e && e.message) || e) }) })
      }

      // 覆盖一旦与轮询回来的真值一致就撤掉 ——
      // 否则它会永远盖着真值，别处（手改配置文件）的改动就再也看不见了。
      useEffect(function () {
        setOpt(function (o) {
          var next = null
          for (var k in o) {
            var it = null
            for (var j = 0; j < items.length; j++) if (items[j].name === k) { it = items[j]; break }
            if (it && !!it.denied === o[k]) { if (!next) next = Object.assign({}, o); delete next[k] }
          }
          return next || o
        })
      }, [items])

      // 分组 + 排序。
      //
      // ★ 顺序**不能随勾选变化**。上一版把裁掉的顶到最前面，于是你点一下
      //   方框，这一行就从指针底下消失了——点错了都找不回来。
      //   现在按 族 → 名字 排，这两个字段都不随勾选改变，所以行永远在原地。
      //   要强调"裁掉了"就靠行内状态和一个筛选器，不靠位置。
      //
      // 乐观覆盖**只在这一处**应用，然后整包交给纯函数：denied 不参与行序，
      // 所以勾选不会让任何一行换位置，变的只是"哪些行被筛进来"。
      var itemsEff = useMemo(function () {
        var any = false
        for (var k in opt) { any = true; break }
        if (!any) return items
        return items.map(function (i) {
          return Object.prototype.hasOwnProperty.call(opt, i.name)
            ? Object.assign({}, i, { denied: opt[i.name] })
            : i
        })
      }, [items, opt])

      var groups = useMemo(function () { return toolGroups(itemsEff, q, filter) }, [itemsEff, q, filter])
      var shownCount = groups.filter(function (g) { return g.kind === 'row' }).length
      // 有搜索词或非默认筛选时一律展开：搜到了却看不见，比不搜更糟 ——
      // 人会以为"没有匹配"，然后去改搜索词。
      // props.forceOpen 是**受控口子**（离线渲染/截图/测试用），与 PendingBar / TriageTab
      // 的受控模式同一套惯例。默认收起会让结构测试一行都渲染不出来。
      var forceOpen = !!(props && props.forceOpen) || !!q || filter !== 'all'
      var visibleGroups = useMemo(
        function () { return toolRowsVisible(groups, { collapsed: collapse, forceOpen: forceOpen }) },
        [groups, collapse, forceOpen],
      )
      var visibleRows = visibleGroups.filter(function (g) { return g.kind === 'row' }).length

      if (!catalog.capturedAt) {
        return h('div', { className: 'lw-sec' },
          h('div', { className: 'lw-sec-h' }, h('span', { className: 'lw-sec-t' }, '工具目录')),
          h('div', { className: 'lw-empty' },
            '目录快照还没捕获。能力包装配发生在会话创建时——开一次新会话，这里就会有数。'))
      }

      return h('div', { className: 'lw-sec' },
        h('div', { className: 'lw-sec-h' },
          h('span', { className: 'lw-sec-t' }, '工具'),
          h('span', { className: 'lw-sec-n' },
            '常驻 ' + num(totals.kept) + ' 个 · ' + tok(totals.keptTokens) + ' token'
            + '　裁掉 ' + num(totals.denied) + ' 个 · ' + tok(totals.deniedTokens) + ' token'),
          h('span', { className: 'lw-sec-n' }, '（共 ' + num(totals.total || items.length) + '）')
        ),
        h('div', { className: 'lw-bar' },
          h(Field, {
            className: 'lw-field',
            value: q,
            placeholder: '按名字筛工具…',
            onChange: function (e) { setQ(e && e.target ? e.target.value : '') },
            'aria-label': '筛选工具',
          }),
          q ? h(Btn, { size: 'sm', onClick: function () { setQ('') } }, '清除') : null
        ),
        // 全部展开 / 收起：默认全收起之后，想通览一遍的人需要一条路。
        // 没有它，"我要看全部"就只剩逐个点开五族。
        h('div', { className: 'lw-bar' },
          h(Btn, {
            size: 'sm',
            onClick: function () {
              setCollapse(function (c0) {
                var anyClosed = groups.some(function (g) {
                  return g.kind === 'group' && !familyOpen(g.family, c0, false)
                })
                var n = Object.assign({}, c0)
                for (var i = 0; i < groups.length; i++) {
                  if (groups[i].kind === 'group') n[groups[i].family] = anyClosed ? false : true
                }
                return n
              })
            },
          }, '全部展开 / 收起')
        ),
        // 用筛选器表达"我只看裁掉的"，而不是把裁掉的挪到最前面。
        // 位置一旦会动，你就再也点不准第二下了。
        h('div', { className: 'lw-bar' },
          [['all', '全部'], ['denied', '只看已裁'], ['kept', '只看常驻']].map(function (pair) {
            return h(Chip, {
              key: pair[0],
              active: filter === pair[0],
              onClick: function () { setFilter(pair[0]) },
            }, pair[1])
          }),
          h('span', { className: 'lw-sec-n', style: { marginLeft: 'auto' } },
            num(shownCount) + ' 行' + (visibleRows < shownCount ? '（收起中，显示 ' + num(visibleRows) + ' 行）' : ''))
        ),
        msg ? h('div', { className: 'lw-msg ' + (msg.ok ? 'ok' : 'err') }, msg.text) : null,
        h('table', { className: 'lw-table' },
          h('colgroup', null,
            h('col', { style: { width: '34px' } }),
            h('col', null),
            h('col', { style: { width: '92px' } })
          ),
          h('thead', null, h('tr', null,
            h('th', { className: 'lw-th' }, ''),
            h('th', { className: 'lw-th' }, '工具 / 用途'),
            h('th', { className: 'lw-th r' }, '约 token')
          )),
          h('tbody', null,
            groups.length
              ? visibleGroups.map(function (g, gi) {
                  if (g.kind === 'group') {
                    // 族提成组标题：说一次，而不是在每一行重复一遍。
                    // 顺带把那一列的宽度让给用途。
                    // 注意这里叫「族」不叫「来源」——DSH 的工具注册表不暴露归属插件
                    // （schemaOf 只投影 name/description/parameters），
                    // 命名族是从名字前缀推的，是事实但不是归属声明。
                    var shut = !familyOpen(g.family, collapse, forceOpen)
                    return h('tr', { key: 'g' + gi, className: 'lw-group' },
                      h('td', { className: 'lw-td', colSpan: 3 },
                        h('button', {
                          type: 'button',
                          className: 'lw-groupbtn',
                          'aria-expanded': shut ? 'false' : 'true',
                          // 折叠不是装饰：72 行 ≈ 6 屏，收起来才看得全。
                          title: shut ? '展开这一族' : '收起这一族',
                          onClick: function () {
                            setCollapse(function (c0) {
                              var n = Object.assign({}, c0)
                              n[g.family] = familyOpen(g.family, c0, false)   // 现在是开的 -> 收起
                              return n
                            })
                          },
                        },
                          h('span', { className: 'lw-group-chev' }, shut ? '▸' : '▾'),
                          h('span', { className: 'lw-group-name' }, g.family),
                          h('span', { className: 'lw-group-n' }, g.n + ' 个'),
                          h('span', { className: 'lw-group-n' }, tok(g.tokens)),
                          g.denied ? h('span', { className: 'lw-group-n' }, '已裁 ' + g.denied) : null)))
                  }
                  var i = g.item
                  return h('tr', { key: i.name, className: 'lw-tr' },
                    h('td', { className: 'lw-td' },
                      h('input', {
                        type: 'checkbox',
                        checked: !i.denied,
                        disabled: busy === i.name,
                        'aria-label': (i.denied ? '放回 ' : '裁掉 ') + i.name,
                        onChange: function () { toggle(i.name, i.denied) },
                      })),
                    h('td', { className: 'lw-td' },
                      h('div', { className: 'lw-2l' },
                        h('span', { className: 'lw-name' + (i.denied ? ' c-dim' : '') },
                          i.name,
                          // 状态用行内标记，不用位置。位置会动的话就没法连续操作了。
                          i.denied ? h('span', { className: 'lw-off' }, '已裁') : null),
                        i.purpose ? h('span', { className: 'lw-sub', title: i.purpose }, i.purpose) : null)),
                    h('td', { className: 'lw-td r' }, h('span', { className: 'lw-num' }, tok(i.approxTokens)))
                  )
                })
              : h('tr', null, h('td', { className: 'lw-td', colSpan: 3 },
                  h('span', { className: 'lw-empty' },
                    q ? '没有匹配「' + q + '」的工具'
                      : (filter === 'denied' ? '没有已裁的工具' : '没有常驻的工具')))))
        ),
        h('p', { className: 'lw-note' },
          '取消勾选 = 从默认工具表里裁掉，模型看不到它，也就不会再为它付 token。'
          + (cap.enabled ? '' : '（注意：能力包当前是关闭状态。）'))
      )
    }

// ── 模块：components/skills ───────────────────────────────────────
// 技能表：常驻/触发两笔成本分开算。
    function SkillsSection(props) {
      var sk = props.state.skills || {}
      var items = sk.items || []
      var totals = sk.totals || {}
      var openState = useState(null)
      var open = openState[0], setOpen = openState[1]

      if (!sk.available) {
        return h('div', { className: 'lw-sec' },
          h('div', { className: 'lw-sec-h' }, h('span', { className: 'lw-sec-t' }, '技能')),
          h('div', { className: 'lw-empty' }, '读不到技能注册表：' + (sk.reason || '未知原因')))
      }

      var maxCat = items.reduce(function (m, i) { return Math.max(m, i.catalogTokens || 0) }, 0)
      var maxBody = items.reduce(function (m, i) { return Math.max(m, i.bodyTokens || 0) }, 0)

      // 「能读注册表，但一条也没有」曾经是最让人困惑的状态：
      // 它显示成一张空表，看起来像"你没装技能"。真实原因通常是**没带 agent 作用域**——
      // 技能 provider 挂在 preset 的作用域层，不带 scope 只看得见空的全局层。
      // 所以这个状态必须自己解释自己，不能静默。
      if (!items.length) {
        return h('div', { className: 'lw-sec' },
          h('div', { className: 'lw-sec-h' },
            h('span', { className: 'lw-sec-t' }, '技能'),
            h('span', { className: 'lw-sec-n' }, '0 个')
          ),
          h('div', { className: 'lw-empty' },
            '注册表答上来了，但里面一个技能也没有。',
            h('br', null),
            '这一页会扫描所有已注册的作用域层，所以不需要先开一次会话来"激活"它。',
            h('br', null),
            '技能从这些根目录读：项目内的 .dsh/skills 与 .agents/skills、',
            '以及用户级的 ~/.dsh/skills 与 ~/.agents/skills。')
        )
      }

      return h('div', { className: 'lw-sec' },
        h('div', { className: 'lw-sec-h' },
          h('span', { className: 'lw-sec-t' }, '技能'),
          h('span', { className: 'lw-sec-n' },
            num(totals.count) + ' 个 · 常驻目录 ' + tok(totals.catalogTokens) + ' token'
            + '　正文合计 ' + tok(totals.bodyTokens) + ' token'),
          // 顺序不写出来就会显得随意。这一页是按"每轮都在付的那笔"降序排的。
          h('span', { className: 'lw-sec-n' }, '按常驻成本降序')
        ),
        h('table', { className: 'lw-table' },
          h('colgroup', null,
            h('col', { style: { width: '26px' } }),
            h('col', null),
            h('col', { style: { width: '84px' } }),
            h('col', { style: { width: '84px' } }),
            h('col', { style: { width: '150px' } })
          ),
          h('thead', null, h('tr', null,
            h('th', { className: 'lw-th' }, ''),
            h('th', { className: 'lw-th' }, '技能'),
            h('th', { className: 'lw-th r' }, '常驻'),
            h('th', { className: 'lw-th r' }, '触发'),
            h('th', { className: 'lw-th' }, '来源')
          )),
          h('tbody', null, items.map(function (s) {
            var isOpen = open === s.name
            return [
              h('tr', {
                key: s.name,
                className: 'lw-tr x',
                'aria-expanded': isOpen,
                onClick: function () { setOpen(isOpen ? null : s.name) },
              },
                h('td', { className: 'lw-td' },
                  h('button', {
                    type: 'button',
                    className: 'lw-chevbtn',
                    'aria-expanded': isOpen,
                    'aria-label': (isOpen ? '收起技能 ' : '展开技能 ') + s.name,
                    onClick: function (e) { e.stopPropagation(); setOpen(isOpen ? null : s.name) },
                  }, h(Chev, { open: isOpen }))),
                h('td', { className: 'lw-td' },
                  h('div', { className: 'lw-2l' },
                    h('span', { className: 'lw-id' }, s.name),
                    s.description ? h('span', { className: 'lw-sub', title: s.description }, s.description) : null)),
                // 常驻 = 每轮都要背的目录摘要；触发 = 真正 skill() 调用时才付的正文。
                h('td', { className: 'lw-td r' }, h('span', { className: 'lw-num' }, tok(s.catalogTokens))),
                h('td', { className: 'lw-td r' }, h('span', { className: 'lw-num' }, s.bodyKnown ? tok(s.bodyTokens) : '—')),
                h('td', { className: 'lw-td' }, h('span', { className: 'lw-src', title: s.source }, s.source || '—'))
              ),
              isOpen ? h('tr', { key: s.name + ':d' }, h('td', { className: 'lw-td detail', colSpan: 5 },
                h('div', { className: 'lw-exp' },
                  h('div', { className: 'lw-meta' },
                    h('span', null, s.modelInvocable ? '模型可调用' : '模型不可调用'),
                    h('span', null, s.userInvocable ? '用户可调用' : '用户不可调用'),
                    h('span', null, '常驻 ' + tok(s.catalogTokens) + ' token'),
                    s.bodyKnown ? h('span', null, '正文 ' + tok(s.bodyTokens) + ' token') : null
                  ),
                  s.description ? h('div', { className: 'lw-note', style: { color: 'var(--lw-fg2)' } }, s.description) : null,
                  s.whenToUse ? h('div', { className: 'lw-note' }, '何时用：' + s.whenToUse) : null,
                  h('div', { style: { marginTop: '10px' } },
                    h('div', { className: 'lw-list' },
                      h(BarRow, { name: '常驻（每轮都付）', value: s.catalogTokens, max: maxCat, display: tok(s.catalogTokens) }),
                      h(BarRow, { name: '正文（调用才付）', value: s.bodyTokens, max: maxBody, display: s.bodyKnown ? tok(s.bodyTokens) : '未读到' })
                    )),
                  s.bodyError ? h('div', { className: 'lw-note c-bad' }, '正文读取失败：' + s.bodyError) : null,
                  s.bodyPreview
                    ? h('div', { style: { marginTop: '12px' } },
                        h('div', { className: 'lw-sec-n', style: { marginBottom: '4px' } }, '正文开头'),
                        h(Md, { text: s.bodyPreview }))
                    : null
                ))) : null
            ]
          }))
        ),
        h('p', { className: 'lw-note' },
          '常驻 = 技能名 + 描述，每一轮都在提示词里，不用也要付。触发 = SKILL.md 正文，'
          + '只有模型真的调用它才付一次。所以：描述写得长又从不用的技能，才是真正该改的那个。')
      )
    }

    /**
     * 能力页签的内部分段：工具／技能。
     *
     * 为什么分段：71 个工具 + 11 个技能首尾相接堆在一列里，得到的是一条
     * 很长的滚动条——而这两件事在**读的时候**从不同时有用：
     *   看工具 = "我该把哪个裁掉"（按族扫一遍，做的是减法）
     *   看技能 = "哪个技能的描述写太长"（按常驻成本降序，做的是归因）
     * 一次回答一个，两边都变短。
     *
     * 刻意不做成"折叠抽屉"：折叠会保留滚动位置，展开时你还得重新找自己在哪。
     * 分段是替换——切回来时位置由这一段的顶部重新开始，可预期。
     * 数字标在段上，所以不必点进去才知道另一边有多少。
     */
// ── 模块：components/capabilities ─────────────────────────────────
// 能力页签外壳：工具 + 技能两节拼装。
    function CapabilitiesTab(props) {
      var segState = useState((props && props.initialSeg) || 'tools')
      var seg = segState[0], setSeg = segState[1]
      var cap = props.state.capabilities || {}
      var sk = props.state.skills || {}
      var toolN = (cap.totals && cap.totals.total) || 0
      var skillN = (sk.totals && sk.totals.count) || 0
      var segs = [
        { id: 'tools', label: '工具 ' + num(toolN) },
        { id: 'skills', label: '技能 ' + num(skillN) },
      ]
      var segIds = segs.map(function (s) { return s.id })
      return h('div', null,
        h('div', {
          className: 'lw-seg', role: 'tablist', 'aria-label': '能力分段',
          onKeyDown: tabKeys(segIds, seg, setSeg),
        },
          segs.map(function (s) {
            return h(Chip, {
              key: s.id,
              active: seg === s.id,
              onClick: function () { setSeg(s.id) },
              // role/aria 显式写上：这是键盘用户唯一的"我在哪个分段"依据，
              // 光靠颜色在无样式渲染下什么也说明不了。
              role: 'tab',
              'aria-selected': seg === s.id,
            }, s.label)
          })
        ),
        seg === 'tools' ? h(ToolsSection, props) : h(SkillsSection, props)
      )
    }