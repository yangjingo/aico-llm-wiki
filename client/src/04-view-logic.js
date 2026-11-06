// ═══ 04-view-logic.js · 视图纯函数：不碰 DOM 的派生/筛选逻辑 ═══
// （源码文件，编辑后运行 pnpm run build:client 合成 client/client.js）
// ── 模块：components/tools（排序/分组/可见性纯函数部分）─────────
// ── 模块：components/knowledge（筛选/视图纯函数部分）────────────
// （两区主体见 05-capabilities.js / 06-knowledge.js。）
    // ── 视图逻辑：纯函数，不碰 DOM ────────────────────────────────────────
    //
    // 排序/分组/筛选从组件里提出来，是为了**能被离线断言**。
    // 之前它们长在 useMemo 里，只有真把 React 挂到浏览器上才跑得到，
    // 于是"分组对不对""筛选选得对不对"这类问题只能靠肉眼看——而肉眼刚刚
    // 已经放过一次 bug（三元少写 : null，整棵树渲染就炸）。
    // 现在：纯函数由 verify-render.mjs 穷举断言，组件只负责把结果画出来。
    //
    // 位置稳定仍然是第一原则：这两个函数的输出**不随证据/勾选变化**，
    // 变的只是"哪些行被筛进来了"。

    /** 工具表的行序：族 → 名字。两个字段都与勾选无关，所以行永远在原地。 */
    function toolGroups(items, q, filter) {
      var s = String(q || '').trim().toLowerCase()
      var list = items
      if (s) list = list.filter(function (i) { return String(i.name).toLowerCase().indexOf(s) >= 0 })
      if (filter === 'denied') list = list.filter(function (i) { return i.denied })
      if (filter === 'kept') list = list.filter(function (i) { return !i.denied })

      // 族的切分在宿主侧算（lib/capabilities.js）：成员够多的前缀才算族，
      // 其余归「核心」。这里只管排——核心在前，其余按字母，族内按名字。
      var sorted = list.slice().sort(function (a, b) {
        var fa = a.family || '核心'
        var fb = b.family || '核心'
        if (fa !== fb) {
          if (fa === '核心') return -1
          if (fb === '核心') return 1
          return fa < fb ? -1 : 1
        }
        return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0)
      })

      var out = []
      var cur = null
      // ★ 组的下标必须单独记住，不能用 out[out.length - 1]。
      //   那是个真 bug（由 verify-render.mjs 第一次跑就抓到）：
      //   循环体先 push 行、下一轮再 push 组时，out 末尾已经是**行**了，
      //   于是 n++ 加到了行对象身上，而组标题里的计数恒为 1 ——
      //   界面上每个族都写着"1"，看着像"这些族各只有一条"，实际不是。
      var gi = -1
      for (var k = 0; k < sorted.length; k++) {
        var it = sorted[k]
        var fam = it.family || '核心'
        if (fam !== cur) { cur = fam; out.push({ kind: 'group', family: fam, n: 0, tokens: 0, denied: 0 }); gi = out.length - 1 }
        out[gi].n++
        // 折叠之后标题就是这一族**唯一**看得见的东西，所以它得自己把话说完：
        // 几条、多少 token、裁掉几条。少了这些，收起来等于什么都不知道。
        out[gi].tokens += Number(it.approxTokens) || 0
        if (it.denied) out[gi].denied++
        out.push({ kind: 'row', item: it })
      }
      return out
    }

    /**
     * 这一族现在是展开的吗？
     *
     * 默认**全部收起**。
     *
     * 一开始我让「核心」默认展开，量完才发现那个默认几乎没用：核心族是**最大**的
     * 一族（44 / 72 个工具），展开它等于没折 —— 6 屏变成 3.5 屏。
     * 收起全部之后一屏就能看全五族的条数与 token，要哪一族再点开。
     *
     * 收起不等于看不见：族标题自己带着（几个 / 多少 token / 裁掉几个），
     * 所以"先看全局再展开"这条路是通的，而不是"先看到一片空白"。
     */
    function familyOpen(fam, collapsed, forceOpen) {
      if (forceOpen) return true
      if (collapsed && Object.prototype.hasOwnProperty.call(collapsed, fam)) return collapsed[fam] === false
      return false
    }

    /**
     * 折叠后实际要渲染的行。**纯函数** —— 折叠逻辑不经过 React 也能被穷举断言。
     *
     * forceOpen（有搜索词或非默认筛选）时**一律展开**：
     * 搜到了却看不见，比不搜更糟 —— 人会以为"没有匹配"。
     */
    function toolRowsVisible(groups, opts) {
      var collapsed = (opts && opts.collapsed) || {}
      var forceOpen = !!(opts && opts.forceOpen)
      var out = []
      var cur = null
      for (var i = 0; i < groups.length; i++) {
        var g = groups[i]
        if (g.kind === 'group') { cur = g.family; out.push(g); continue }
        if (!familyOpen(cur, collapsed, forceOpen)) continue
        out.push(g)
      }
      return out
    }

    /** 知识表的筛选档。判据直接复用行内「证据」那一列的 cls —— 两处永远一致。 */
    var KFILTERS = [
      { id: 'all', label: '全部', test: function () { return true } },
      { id: 'confirmed', label: '已确认', test: function (p) { return p.cls === 'confirmed' } },
      { id: 'unconfirmed', label: '未确认', test: function (p) { return p.cls === 'unconfirmed' || p.cls === 'new' } },
      { id: 'suspect', label: '有反证', test: function (p) { return (p.suspect || 0) > 0 } },
      { id: 'quarantined', label: '已隔离', test: function (p) { return !!p.quarantined } },
    ]

    function filterById(list, id) {
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]
      return null
    }

    /**
     * 知识表的行序与筛选。
     *
     * ★ 排序键是 id，而 id 是页面身份——不随命中、不随确认、不随反证变。
     *   上一版按"需关注度"排（隔离 > 有嫌疑 > 未确认 > 其余），那四档全由
     *   证据决定，而证据每 8 秒轮询刷新一次：你展开一行读正文，下一轮询它
     *   就可能换位置。和工具表上修掉的是同一种病。
     */
    function knowledgeView(committed, filterId) {
      var sorted = committed.slice().sort(function (a, b) {
        var ia = String(a.id || ''), ib = String(b.id || '')
        return ia < ib ? -1 : (ia > ib ? 1 : 0)
      })
      var f = filterById(KFILTERS, filterId) || KFILTERS[0]
      return { sorted: sorted, shown: sorted.filter(f.test), filter: f }
    }

    /**
     * 页签的方向键移动。
     *
     * 列表很短，所以不做 roving tabindex —— 每个页签本身都能 Tab 到，
     * 方向键只是额外的加速路径（左右循环、Home/End 到两端）。
     * preventDefault 是必需的：否则方向键会顺带把整个面板滚一下，
     * 用户以为界面在抖。
     */
    function tabKeys(ids, current, select) {
      return function (e) {
        var i = ids.indexOf(current)
        if (i < 0) return
        var n = -1
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % ids.length
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + ids.length) % ids.length
        else if (e.key === 'Home') n = 0
        else if (e.key === 'End') n = ids.length - 1
        if (n < 0) return
        e.preventDefault()
        select(ids[n])
      }
    }
