// ═══ 09-graph.js · 图谱：vendor UMD 加载 + 知识结构力导向可视化 ═══
// （源码文件，编辑后运行 pnpm run build:client 合成 client/client.js）
// ── 模块：components/graph ────────────────────────────────────────
// 知识图谱：vendor UMD 注入（loadVendorScript）+ D3Graph + 视觉判据纯函数 + GraphTab。

    // ── 三方包加载：client/vendor 的 UMD 经宿主静态路由注入 ────────────────
    //
    // 零构建约束不变：不引打包器，vendor UMD 由 /aico-llm-wiki/vendor/* 提供，
    // 运行时按需 <script> 注入一次。失败返回 null，调用方回落静态渲染。
    function loadVendorScript(src) {
      return new Promise(function (done) {
        if (typeof document === 'undefined') return done(null)
        var existing = document.querySelector('script[data-lw-vendor="' + src + '"]')
        if (existing) {
          if (existing.__lwLoaded) return done(window.d3 || null)
          existing.addEventListener('load', function () { done(window.d3 || null) })
          existing.addEventListener('error', function () { done(null) })
          return
        }
        var s = document.createElement('script')
        s.src = src; s.async = true
        s.setAttribute('data-lw-vendor', src)
        s.onload = function () { s.__lwLoaded = true; done(window.d3 || null) }
        s.onerror = function () { done(null) }
        document.head.appendChild(s)
      })
    }

    /** Neo4j Browser 风格交互图：d3-force + 缩放平移 + 节点拖拽 + 悬停/选中高亮。
     *  d3 拥有 svg 子树（React 只给容器 ref）；选中态仍回写 React state，
     *  抽屉/固化/跳转等交互全部复用静态版那套。主题：华为红体系（spec 05）。 */
    function D3Graph(props) {
      var ref = useRef(null)
      useEffect(function () {
        var d3 = props.d3
        var el = ref.current
        if (!d3 || !el) return
        var g = props.graph || {}
        var nodes = (g.nodes || []).map(function (n) { return Object.assign({}, n) })
        var links = (g.edges || []).map(function (e) { return { source: e.a, target: e.b, type: e.type, weight: e.weight || 1 } })
        var W = (el.clientWidth || 900), H = (el.clientHeight || 460)

        var svg = d3.select(el).append('svg')
          .attr('width', '100%').attr('height', '100%')
          .attr('viewBox', [0, 0, W, H])
        var root = svg.append('g')
        svg.call(d3.zoom().scaleExtent([0.25, 4]).on('zoom', function (ev) { root.attr('transform', ev.transform) }))

        var rOf = function (n) { return 5 + Math.min(9, 2 * Math.log1p((n.hits || 0) * 2 + (n.degree || 0))) }
        var nbr = {}
        if (props.sel) {
          for (var i = 0; i < links.length; i++) {
            if (links[i].source === props.sel) nbr[links[i].target] = true
            if (links[i].target === props.sel) nbr[links[i].source] = true
          }
        }
        var dimOf = function (id) { return !!props.sel && id !== props.sel && !nbr[id] }

        var link = root.append('g').selectAll('line').data(links).join('line')
          .attr('stroke', function (l) { return l.type === 'co' ? GEDGE.co : GEDGE.tag })
          .attr('stroke-width', function (l) { return l.type === 'co' ? 1.4 + Math.min(1.6, l.weight * 0.3) : 1 })
          .attr('stroke-dasharray', function (l) { return l.type === 'co' ? null : '3 3' })
          .attr('opacity', function (l) {
            var w = l.weight, base = w >= 3 ? 0.85 : w >= 2 ? 0.6 : 0.4
            var active = !props.sel || l.source === props.sel || l.target === props.sel
            return active ? base : 0.07
          })

        var node = root.append('g').selectAll('circle').data(nodes).join('circle')
          .attr('r', rOf)
          .attr('fill', function (n) { return n.quarantined ? '#c9ced4' : (GCOLOR[n.category] || GCOLOR.fact) })
          .attr('stroke', function (n) { return n.quarantined ? '#b5333b' : (n.id === props.sel ? '#1a1a1c' : '#fff') })
          .attr('stroke-width', function (n) { return n.id === props.sel ? 2.5 : (n.quarantined ? 2 : 1.5) })
          .attr('stroke-dasharray', function (n) { return n.status === 'staged' ? '3 2' : null })
          .attr('opacity', function (n) { return dimOf(n.id) ? 0.15 : (n.status === 'staged' ? 0.6 : 0.95) })
          .style('cursor', 'pointer')
          .on('click', function (ev, n) { ev.stopPropagation(); props.setSel(n.id === props.sel ? null : n.id) })
          .on('mouseenter', function (ev, n) {
            // 悬停高亮邻居（Neo4j 式灰化其它）——只动透明度，不动位置。
            var nn = {}
            for (var k = 0; k < links.length; k++) {
              if (links[k].source.id === n.id || links[k].source === n.id) nn[typeof links[k].target === 'object' ? links[k].target.id : links[k].target] = true
              if (links[k].target.id === n.id || links[k].target === n.id) nn[typeof links[k].source === 'object' ? links[k].source.id : links[k].source] = true
            }
            node.attr('opacity', function (m) { return m.id === n.id || nn[m.id] ? (m.status === 'staged' ? 0.6 : 0.95) : 0.15 })
            link.attr('opacity', function (l) {
              var s = typeof l.source === 'object' ? l.source.id : l.source
              var t = typeof l.target === 'object' ? l.target.id : l.target
              return s === n.id || t === n.id ? 0.9 : 0.07
            })
          })
          .on('mouseleave', function () {
            node.attr('opacity', function (m) { return dimOf(m.id) ? 0.15 : (m.status === 'staged' ? 0.6 : 0.95) })
            link.attr('opacity', function (l) {
              var base = l.weight >= 3 ? 0.85 : l.weight >= 2 ? 0.6 : 0.4
              var s = typeof l.source === 'object' ? l.source.id : l.source
              var t = typeof l.target === 'object' ? l.target.id : l.target
              var active = !props.sel || s === props.sel || t === props.sel
              return active ? base : 0.07
            })
          })
        node.append('title').text(function (n) { return n.title + ' · ' + n.category + ' · 度 ' + n.degree + ' · 命中 ' + n.hits })

        var label = root.append('g').selectAll('text').data(nodes).join('text')
          .text(function (n) { return graphLabelCut(n.label || n.title) })
          .attr('text-anchor', 'middle')
          .attr('fill', function (n) { return n.id === props.sel ? '#1a1a1c' : '#566472' })
          .attr('font-weight', function (n) { return n.id === props.sel ? 700 : 400 })
          .attr('opacity', function (n) { return dimOf(n.id) ? 0.15 : 1 })
          .attr('pointer-events', 'none')

        var sim = d3.forceSimulation(nodes)
          .force('link', d3.forceLink(links).id(function (n) { return n.id })
            .distance(function (l) { return 90 / (1 + Math.log1p(l.weight)) })
            .strength(function (l) { return l.type === 'co' ? 0.5 : 0.15 }))
          .force('charge', d3.forceManyBody().strength(-220))
          .force('center', d3.forceCenter(W / 2, H / 2))
          .force('collide', d3.forceCollide().radius(function (n) { return rOf(n) + 14 }))
          .on('tick', function () {
            link.attr('x1', function (l) { return l.source.x }).attr('y1', function (l) { return l.source.y })
              .attr('x2', function (l) { return l.target.x }).attr('y2', function (l) { return l.target.y })
            node.attr('cx', function (n) { return n.x }).attr('cy', function (n) { return n.y })
            label.attr('x', function (n) { return n.x }).attr('y', function (n) { return n.y + rOf(n) + 12 })
          })

        node.call(d3.drag()
          .on('start', function (ev, n) { if (!ev.active) sim.alphaTarget(0.25).restart(); n.fx = n.x; n.fy = n.y })
          .on('drag', function (ev, n) { n.fx = ev.x; n.fy = ev.y })
          .on('end', function (ev, n) { if (!ev.active) sim.alphaTarget(0); n.fx = null; n.fy = null }))

        // 选中变化时整图重建（小图代价可忽略，逻辑与静态版单一来源）。
        return function () { try { sim.stop() } catch (e) {} try { svg.remove() } catch (e) {} }
      }, [props.graph, props.d3, props.sel])
      return h('div', { className: 'lw-d3', ref: ref })
    }

    // ── 图谱：知识结构的力导向可视化 ──────────────────────────────────────
    //
    // 数据全部来自 /api/graph（节点带服务端算好的确定性坐标），客户端不跑
    // 力导向——同一份数据在任何端画出的图一致，离线渲染/截图也一致。
    //
    // 边只有两种、都可解释：tag（共享标签）与 co（同一次召回共命中）。
    // 这张图要回答的是「我的知识长什么样、哪些总是一起被需要」，
    // 不是「哪些页面文本相似」——后者是检索的事，不该混进结构图里。
    // 配色（华为红三色体系，docs/spec/05-huawei-redesign.md；取代 spec 02 莫兰迪）：
    // 红 #b5333b 只给重点（fact 主体、co 边、警示）；强调蓝 #1565c0 点睛
    // （decision——「答案/是…」类语义）；其余映射灰蓝/辅红/中性灰。
    var GCOLOR = {
      fact: '#b5333b',      // 品牌红：知识主体
      decision: '#1565c0',  // 强调蓝：决策点睛（一页最多一两处的那类）
      lesson: '#566472',    // 灰蓝：教训（第二色）
      howto: '#cf6b72',     // 辅红：操作指南
    }
    var GEDGE = {
      co: '#b5333b',        // 共召回=品牌红实线：本图最强信号
      tag: 'rgba(86,100,114,.55)', // 共享标签=灰蓝虚线：结构背景
    }
    var GBG = '#fafafa'     // 浅底画布

    /** 纯函数：节点半径。命中越多越大，但封顶——大节点会盖住邻居。 */
    function graphNodeRadius(n) {
      return 5 + Math.min(9, 2 * Math.log1p((n.hits || 0) * 2 + (n.degree || 0)))
    }

    /** 纯函数：节点该不该带标签（标签全画会糊成一片，只画「重要的 + 被选的」）。 */
    function graphLabelWorthy(n, selId) {
      return n.id === selId || (n.degree || 0) > 0 || (n.hits || 0) > 0 || n.status === 'staged'
    }

    /** 纯函数：标题截断。中文 10 个字已经比节点本身宽很多了。 */
    function graphLabelCut(title, max) {
      var t = String(title || '')
      var m = max || 10
      return t.length > m ? t.slice(0, m) + '…' : t
    }

    /** 纯函数：边的视觉档位（透明度按权重分三档，虚线=纯 tag 边）。 */
    function graphEdgeStyle(e, selId, neighbors) {
      var active = !selId || e.a === selId || e.b === selId
      var w = e.weight || 1
      var op = w >= 3 ? 0.95 : w >= 2 ? 0.7 : 0.45
      if (!active) op = 0.12
      return {
        stroke: e.type === 'co' ? GEDGE.co : GEDGE.tag,
        opacity: op,
        dash: e.type === 'co' ? undefined : '3 3',
        // co 边在 tag 边之上：一起被需要是更强的结构性信号
        width: e.type === 'co' ? 1.4 + Math.min(1.6, w * 0.3) : 1,
      }
    }

    function GraphTab(props) {
      // 受控模式：调用方直接给图（离线渲染与截图用）——与 PanelBody 同一套惯例。
      var controlled = !!(props && props.graph)
      var gState = useState(controlled ? props.graph : null)
      var graph = controlled ? props.graph : gState[0]
      var setGraph = gState[1]
      var errState = useState(null)
      var err = errState[0], setErr = errState[1]
      var selState = useState(null)
      var sel = selState[0], setSel = selState[1]
      var detailState = useState({})
      var details = detailState[0], setDetails = detailState[1]
      var msgState = useState(null)
      var msg = msgState[0], setMsg = msgState[1]
      var busyState = useState(false)
      var busy = busyState[0], setBusy = busyState[1]
      // d3 交互模式：浏览器里按需注入 vendor UMD；失败/离线回落静态 SVG。
      var d3State = useState(null)
      var d3 = d3State[0], setD3 = d3State[1]
      useEffect(function () {
        if (controlled) return
        loadVendorScript('/aico-llm-wiki/vendor/d3.min.js?v=7')
          .then(function (lib) { if (lib) setD3(lib) })
      }, [controlled])
      // 目录树跳转载荷：外部指定要选中的节点 id（图谱定位）。
      useEffect(function () {
        if (props.focusNode) setSel(props.focusNode)
      }, [props.focusNode])

      var loadGraph = useCallback(function () {
        if (controlled) return
        getJson(GRAPH_API)
          .then(function (r) {
            if (!r.j || !r.j.ok) throw new Error(r.error || (r.j && r.j.error) || ('HTTP ' + r.status))
            setGraph(r.j); setErr(null)
          })
          .catch(function (e) { setErr(String((e && e.message) || e)) })
      }, [controlled])

      useEffect(function () { loadGraph() }, [loadGraph])

      // 选中即取正文（带缓存，与知识页签 loadPage 同一套做法）。
      var loadDetail = useCallback(function (id) {
        if (controlled) return
        setDetails(function (d) {
          if (d[id]) return d
          var next = Object.assign({}, d)
          next[id] = { loading: true }
          return next
        })
        getJson(PAGE_API + '?id=' + encodeURIComponent(id))
          .then(function (r) {
            setDetails(function (d) {
              var next = Object.assign({}, d)
              next[id] = (r.j && r.j.ok) ? { data: r.j } : { error: r.error || (r.j && r.j.error) || ('HTTP ' + r.status) }
              return next
            })
          })
          .catch(function (e) {
            setDetails(function (d) {
              var next = Object.assign({}, d)
              next[id] = { error: String((e && e.message) || e) }
              return next
            })
          })
      }, [controlled])

      useEffect(function () { if (sel) loadDetail(sel) }, [sel, loadDetail])

      var commit = function (id) {
        setBusy(true)
        post('/aico-llm-wiki/api/commit', { id: id })
          .then(function (r) {
            setBusy(false)
            if (r.j && r.j.ok) {
              setMsg({ ok: true, text: '已固化 ' + id })
              loadGraph(); props.onChanged && props.onChanged()
            } else {
              setMsg({ ok: false, text: '固化失败：' + (r.error || (r.j && r.j.error) || r.status) })
            }
          })
          .catch(function (e) { setBusy(false); setMsg({ ok: false, text: '固化失败：' + String((e && e.message) || e) }) })
      }

      if (err) return h('div', { className: 'lw-msg err' }, '读不到图谱：' + err + '　（' + GRAPH_API + '）')
      if (!graph) return h('div', { className: 'lw-empty' }, '读取中…')

      var nodes = graph.nodes || []
      var edges = graph.edges || []
      var stats = graph.stats || { nodes: nodes.length, edges: edges.length }
      var W = graph.width || 960
      var H = graph.height || 520

      // 邻居集合：选中的节点淡出全图、只亮自己与邻居——「这一页和谁有关」
      // 是点开一个节点时最想问的问题。
      var neighbors = {}
      if (sel) {
        for (var ei = 0; ei < edges.length; ei++) {
          var e = edges[ei]
          if (e.a === sel) neighbors[e.b] = true
          if (e.b === sel) neighbors[e.a] = true
        }
      }
      var selNode = null
      for (var ni = 0; ni < nodes.length; ni++) if (nodes[ni].id === sel) { selNode = nodes[ni]; break }
      var selDetail = sel ? details[sel] : null

      var legend = [
        { c: GCOLOR.fact, t: 'fact' }, { c: GCOLOR.decision, t: 'decision' },
        { c: GCOLOR.lesson, t: 'lesson' }, { c: GCOLOR.howto, t: 'howto' },
      ]

      return h('div', { className: 'lw-graph' },
        h('div', { className: 'lw-graph-main' },
          h('div', { className: 'lw-graph-toolbar' },
            h(Btn, { onClick: loadGraph }, '刷新'),
            h('span', { className: 'lw-tabsum' },
              stats.nodes + ' 页 · ' + stats.edges + ' 连边'
              + (stats.isolated ? ' · ' + stats.isolated + ' 孤立' : '')
              + '（co ' + (stats.coEdges || 0) + ' / tag ' + (stats.tagEdges || 0) + '）'),
            h('span', { className: 'lw-graph-legend' },
              legend.map(function (l) {
                return h('span', { key: l.t, className: 'lw-graph-leg' },
                  h('span', { className: 'lw-graph-swatch', style: { background: l.c } }), l.t)
              }),
              h('span', { className: 'lw-graph-leg', title: '实线=同一次召回共命中（co），虚线=共享标签（tag）' }, '实线 co · 虚线 tag')),
            msg ? h('span', { className: 'lw-msg ' + (msg.ok ? 'ok' : 'err') }, msg.text) : null
          ),
          nodes.length === 0
            ? h('div', { className: 'lw-graph-empty' }, 'wiki 里还没有页面。')
            : h('div', { className: 'lw-graph-svgbox' },
              // d3 可用且非受控 → Neo4j 式交互图；否则静态 SVG（离线渲染/兜底）。
              (d3 && !controlled)
                ? h(D3Graph, { graph: graph, d3: d3, sel: sel, setSel: setSel })
                : h('svg', {
                className: 'lw-graph-svg',
                viewBox: '0 0 ' + W + ' ' + H,
                role: 'img',
                'aria-label': '知识图谱：' + stats.nodes + ' 个页面，' + stats.edges + ' 条连边',
              },
                edges.map(function (e, i) {
                  var an = null, bn = null
                  for (var k = 0; k < nodes.length; k++) {
                    if (nodes[k].id === e.a) an = nodes[k]
                    if (nodes[k].id === e.b) bn = nodes[k]
                  }
                  if (!an || !bn) return null
                  var st = graphEdgeStyle(e, sel, neighbors)
                  return h('line', {
                    key: 'e' + i,
                    x1: an.x, y1: an.y, x2: bn.x, y2: bn.y,
                    stroke: st.stroke, strokeWidth: st.width, opacity: st.opacity,
                    strokeDasharray: st.dash,
                  })
                }),
                nodes.map(function (n) {
                  var r = graphNodeRadius(n)
                  var dimmed = !!sel && n.id !== sel && !neighbors[n.id]
                  // 隔离页不用警示红（红底上会隐身），用深灰紫压暗——
                  // 抽屉和 title 里的「已隔离」仍会说明原因。
                  var fill = n.quarantined ? '#c9ced4' : (GCOLOR[n.category] || GCOLOR.fact)
                  return h('g', {
                    key: n.id,
                    className: 'lw-gnode',
                    transform: 'translate(' + n.x + ',' + n.y + ')',
                    tabIndex: 0,
                    role: 'button',
                    'aria-label': n.title + '（' + n.category + (n.status === 'staged' ? '，暂存' : '') + '）',
                    onClick: function () { setSel(n.id === sel ? null : n.id) },
                    onKeyDown: function (ev) {
                      if (ev && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); setSel(n.id === sel ? null : n.id) }
                    },
                  },
                    h('circle', {
                      r: r,
                      fill: fill,
                      opacity: dimmed ? 0.18 : (n.status === 'staged' ? 0.55 : 0.92),
                      // 描边用底色：节点之间有呼吸感；选中用亮奶油白圈
                      stroke: n.quarantined ? '#b5333b' : (n.id === sel ? '#1a1a1c' : GBG),
                      strokeWidth: n.id === sel ? 2.5 : 1.5,
                      strokeDasharray: n.status === 'staged' ? '3 2' : undefined,
                    }),
                    h('title', null, n.title + ' · ' + n.category + ' · 度 ' + n.degree + ' · 命中 ' + n.hits),
                    graphLabelWorthy(n, sel)
                      ? h('text', {
                          x: 0, y: r + 11,
                          textAnchor: 'middle',
                          fill: n.id === sel ? 'var(--lw-fg)' : 'var(--lw-fg2)',
                          opacity: dimmed ? 0.15 : 1,
                        }, graphLabelCut(n.label || n.title))
                      : null
                  )
                })
              )
            )
        ),
        selNode ? h('div', { className: 'lw-graph-drawer' },
          h('h4', { title: selNode.id }, selNode.title),
          h('div', { className: 'lw-graph-meta' },
            h('span', null, selNode.category),
            h('span', null, selNode.status === 'staged' ? '暂存' : '已固化'),
            h('span', null, '命中 ' + selNode.hits + (selNode.suspect ? ' · 嫌疑 ' + selNode.suspect : '')),
            selNode.quarantined ? h('span', { className: 'c-bad' }, '已隔离') : null,
            selNode.tags && selNode.tags.length ? h('span', null, selNode.tags.join(' · ')) : null
          ),
          selDetail
            ? selDetail.loading
              ? h('div', { className: 'lw-msg' }, '读取中…')
              : selDetail.error
                ? h('div', { className: 'lw-msg err' }, String(selDetail.error))
                : h(Md, { text: (selDetail.data && selDetail.data.body) || '' })
            : null,
          h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'auto' } },
            h(Btn, { onClick: function () { props.onInspect && props.onInspect(selNode.id) } }, '在知识页签查看'),
            selNode.status === 'staged'
              ? h(Btn, {
                  className: 'primary', disabled: busy,
                  title: (selDetail && selDetail.data && selDetail.data.blockers && selDetail.data.blockers.length)
                    ? '缺：' + selDetail.data.blockers.join('、') : '固化后参与自动召回',
                  onClick: function () { commit(selNode.id) },
                }, busy ? '固化中…' : '固化')
              : null,
            h(Btn, { onClick: function () { setSel(null) } }, '关闭')
          )
        ) : null
      )
    }
