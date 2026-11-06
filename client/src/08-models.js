// ═══ 08-models.js · 模型页签组件：谁在问哪个模型、轮换还是单一 ═══
// （源码文件，编辑后运行 pnpm run build:client 合成 client/client.js）
// ── 模块：components/models ───────────────────────────────────────
// 模型页签：ModelListEditor/buildLlmDraft/ModelsTab。

    // ── 模型：谁在问哪个模型，以及轮换还是单一 ────────────────────────────
    //
    // 为什么值得单独一个页签：这个插件的**全部成本**就是模型调用（后台蒸馏 +
    // 会话提炼），而"它到底会问谁"以前是代码里的一个常量，改一次要重载插件。
    //
    // 界面显示两样东西，**刻意分开**：
    //   配置里"下一次会问谁"  ← 你点出来的
    //   上一次**实际**问了谁  ← 真的发生了的
    // 只看前者，一个写错 provider 名字的条目会让人以为轮换在用三个模型。

    /** 一份候选列表的编辑器：模式 + 有序候选 + 增删移。 */
    function ModelListEditor(props) {
      var sel = props.value || { mode: 'single', models: [] }
      var providers = props.providers || []
      var models = sel.models || []
      var addState = useState({ provider: '', model: '' })
      var add = addState[0], setAdd = addState[1]

      var emit = function (nextMode, nextModels) {
        props.onChange({ mode: nextMode || sel.mode, models: nextModels || models })
      }
      var move = function (i, d) {
        var n = models.slice()
        var j = i + d
        if (j < 0 || j >= n.length) return
        var t = n[i]; n[i] = n[j]; n[j] = t
        emit(null, n)
      }
      var drop = function (i) { var n = models.slice(); n.splice(i, 1); emit(null, n) }
      var push = function () {
        if (!add.provider) return
        var n = models.concat([{ provider: add.provider, model: add.model || '' }])
        emit(null, n)
        setAdd({ provider: add.provider, model: '' })
      }
      var cur = null
      for (var i = 0; i < providers.length; i++) if (providers[i].id === add.provider) cur = providers[i]
      var label = function (m) {
        return m.provider + '/' + (m.model || '（该 provider 列出的第一个）')
      }

      return h('div', { className: 'lw-mledit' },
        h('div', { className: 'lw-row' },
          h('span', { className: 'lw-ml-t' }, '模式'),
          h('span', { className: 'lw-seg' },
            h(Chip, { active: sel.mode !== 'rotate', onClick: function () { emit('single') } }, '单一'),
            h(Chip, { active: sel.mode === 'rotate', onClick: function () { emit('rotate') } }, '轮换')
          ),
          h('span', { className: 'lw-ml-note' }, sel.mode === 'rotate'
            ? '每次调用换下一个（按列表顺序循环）'
            : '每次都问列表里的第一个')
        ),
        models.length
          ? h('ol', { className: 'lw-mlist' }, models.map(function (m, i) {
              return h('li', { key: i, className: 'lw-mitem' },
                h('span', { className: 'lw-midx' }, String(i + 1)),
                h('span', { className: 'lw-mname', title: label(m) }, label(m)),
                // 轮换模式下"第一个"是单一模式的落点，值得标出来
                (sel.mode !== 'rotate' && i === 0) ? h('span', { className: 'lw-mtag' }, '单一模式用这个') : null,
                h('span', { className: 'lw-mact' },
                  h('button', { type: 'button', className: 'lw-mini', onClick: function () { move(i, -1) }, disabled: i === 0, title: '上移' }, '↑'),
                  h('button', { type: 'button', className: 'lw-mini', onClick: function () { move(i, 1) }, disabled: i === models.length - 1, title: '下移' }, '↓'),
                  h('button', { type: 'button', className: 'lw-mini', onClick: function () { drop(i) }, title: '移除' }, '×')
                )
              )
            }))
          : h('div', { className: 'lw-empty' }, '没有候选 —— 跟随宿主默认模型（DSH 当前的默认路由）。'),
        h('div', { className: 'lw-row' },
          h('span', { className: 'lw-ml-t' }, '添加'),
          h('select', {
            className: 'lw-sel',
            value: add.provider,
            onChange: function (e) { setAdd({ provider: e.target.value, model: '' }) },
          },
            h('option', { value: '' }, '选择 provider…'),
            providers.map(function (p) { return h('option', { key: p.id, value: p.id }, p.name || p.id) })
          ),
          h('select', {
            className: 'lw-sel',
            value: add.model,
            disabled: !add.provider,
            onChange: function (e) { setAdd({ provider: add.provider, model: e.target.value }) },
          },
            h('option', { value: '' }, (cur && cur.models && cur.models.length) ? '（第一个：' + cur.models[0].id + '）' : '（该 provider 默认）'),
            ((cur && cur.models) || []).map(function (m) { return h('option', { key: m.id, value: m.id }, m.name || m.id) })
          ),
          h(Btn, { onClick: push, disabled: !add.provider }, '加入候选')
        ),
        // 写错 provider 名字的条目会被运行时丢掉。**必须在这里说**，
        // 否则用户以为轮换在用三个模型，实际只有一个。
        (props.rejected && props.rejected.length)
          ? h('div', { className: 'lw-msg warn' }, '有 ' + props.rejected.length + ' 个候选被丢掉了：'
              + props.rejected.map(function (r) { return r.provider + '（' + r.why + '）' }).join('、'))
          : null
      )
    }

    /**
     * 草稿从**轮询回来的真值**起手，之后由用户编辑。
     *
     * 用惰性初始化而不是 useEffect：服务端渲染不跑 effect，用 effect 的话
     * 首帧永远是"读取中…"，界面上闪一下，而且离线渲染测试什么都测不到。
     * 没有草稿时显示的始终是服务端的值，所以手改配置文件也看得见。
     */
    function buildLlmDraft(st, sites) {
      var base = { mode: st.mode || 'single', onError: st.onError || 'next', sites: {} }
      for (var i = 0; i < sites.length; i++) {
        var s = st.sites && st.sites[sites[i].id]
        base.sites[sites[i].id] = {
          mode: (s && s.mode) || base.mode,
          models: ((s && s.models) || st.models || []).map(function (m) {
            return { provider: m.provider || '', model: m.model || '' }
          }),
        }
      }
      return base
    }

    function ModelsTab(props) {
      var st = (props.state && props.state.llm) || {}
      var sites = st.siteList || [
        { id: 'distill', label: '蒸馏（联网补料）' },
        { id: 'harvest', label: '提炼（会话）' },
      ]
      var draftState = useState(function () { return buildLlmDraft(st, sites) })
      var draft = draftState[0], setDraft = draftState[1]
      var catState = useState(null)   // { providers, routes } —— 按需拉，不进轮询
      var cat = catState[0], setCat = catState[1]
      var errState = useState(null)
      var err = errState[0], setErr = errState[1]
      var msgState = useState(null)
      var msg = msgState[0], setMsg = msgState[1]
      var busyState = useState(false)
      var busy = busyState[0], setBusy = busyState[1]

      var loadCat = useCallback(function () {
        getJson(MODELS_API).then(function (r) {
          if (r.j && r.j.ok) { setCat(r.j); setErr(null) } else setErr(r.error || (r.j && r.j.error) || ('HTTP ' + r.status))
        })
      }, [])
      useEffect(function () { loadCat() }, [loadCat])

      var setSite = function (id, v) {
        setDraft(function (d) {
          var n = Object.assign({}, d)
          n.sites = Object.assign({}, d.sites)
          n.sites[id] = v
          return n
        })
        setMsg(null)
      }
      var copyTo = function (from, to) {
        setDraft(function (d) {
          var n = Object.assign({}, d)
          n.sites = Object.assign({}, d.sites)
          n.sites[to] = { mode: d.sites[from].mode, models: d.sites[from].models.map(function (m) { return { provider: m.provider, model: m.model } }) }
          return n
        })
        setMsg(null)
      }
      var save = function () {
        setBusy(true)
        // 根块取第一个站点的内容当**默认**：以后新加的调用点不会落在一个谁也没配过的形状上。
        var first = draft.sites[sites[0].id] || { mode: 'single', models: [] }
        post(LLM_API, {
          mode: first.mode, models: first.models, onError: draft.onError, sites: draft.sites,
        }).then(function (r) {
          setBusy(false)
          if (r.j && r.j.ok) {
            setMsg({ ok: true, text: (r.j.note || '已保存') })
            setCat(function (c) { return c ? Object.assign({}, c, { routes: r.j.routes }) : c })
            props.onChanged && props.onChanged()
          } else setMsg({ ok: false, text: '保存失败：' + (r.error || (r.j && r.j.error) || r.status) })
        })
      }

      var providers = (cat && cat.providers) || []
      var routes = (cat && cat.routes) || {}

      return h('div', null,
        h('div', { className: 'lw-sec' },
          h('div', { className: 'lw-sec-h' },
            h('span', { className: 'lw-sec-t' }, '谁在问模型'),
            h('span', { className: 'lw-sec-n' }, '这个插件的全部成本就是模型调用')
          ),
          h('table', { className: 'lw-table' },
            h('colgroup', null,
              h('col', { style: { width: '150px' } }),
              h('col', { style: { width: '70px' } }),
              h('col', null)
            ),
            h('thead', null, h('tr', null,
              h('th', { className: 'lw-th' }, '环节'),
              h('th', { className: 'lw-th' }, '模式'),
              h('th', { className: 'lw-th' }, '上一次实际用的')
            )),
            h('tbody', null, sites.map(function (s) {
              var used = (st.lastUsed && st.lastUsed[s.id]) || null
              var d = draft.sites[s.id] || { mode: 'single', models: [] }
              return h('tr', { key: s.id, className: 'lw-tr' },
                h('td', { className: 'lw-td' }, s.label),
                h('td', { className: 'lw-td' }, h('span', { className: d.mode === 'rotate' ? 'c-info' : 'c-dim' }, d.mode === 'rotate' ? '轮换' : '单一')),
                h('td', { className: 'lw-td' }, used
                  ? h('span', { className: 'lw-num', title: '第 ' + (used.tries || 1) + ' 个候选成功' }, used.provider + '/' + used.model)
                  : h('span', { className: 'c-dim' }, '还没调用过'))
              )
            }))
          )
        ),

        h('div', { className: 'lw-sec' },
          h('div', { className: 'lw-sec-h' },
            h('span', { className: 'lw-sec-t' }, '失败怎么办'),
            h('span', { className: 'lw-sec-n' }, '一次后台补料失败就丢掉一次采集机会，所以默认往下试')
          ),
          h('div', { className: 'lw-seg' },
            h(Chip, { active: draft.onError !== 'fail', onClick: function () { setDraft(Object.assign({}, draft, { onError: 'next' })); setMsg(null) } }, '失败就换下一个'),
            h(Chip, { active: draft.onError === 'fail', onClick: function () { setDraft(Object.assign({}, draft, { onError: 'fail' })); setMsg(null) } }, '失败就认')
          )
        ),

        err ? h('div', { className: 'lw-msg err' }, '拿不到模型目录：' + err + '　（' + MODELS_API + '）') : null,

        sites.map(function (s, i) {
          var r = routes[s.id] || null
          return h('div', { key: s.id, className: 'lw-sec' },
            h('div', { className: 'lw-sec-h' },
              h('span', { className: 'lw-sec-t' }, s.label),
              r && r.next
                ? h('span', { className: 'lw-sec-n' }, '下一次：' + r.next.provider + '/' + r.next.model + (r.configured ? '' : '（跟随宿主默认）'))
                : null,
              i > 0
                ? h('button', {
                    type: 'button', className: 'lw-mini lw-copy',
                    onClick: function () { copyTo(sites[0].id, s.id) },
                    title: '把「' + sites[0].label + '」这份复制过来',
                  }, '同' + sites[0].label.slice(0, 2))
                : null
            ),
            h(ModelListEditor, {
              value: draft.sites[s.id],
              providers: providers,
              rejected: r && r.rejected,
              onChange: function (v) { setSite(s.id, v) },
            })
          )
        }),

        h('div', { className: 'lw-row lw-savebar' },
          h(Btn, { onClick: save, disabled: busy }, busy ? '保存中…' : '保存'),
          h('span', { className: 'lw-ml-note' }, '写进 wiki.config.json。下一次模型调用即生效，不需要重载插件。'),
          msg ? h('span', { className: 'lw-msg ' + (msg.ok ? 'ok' : 'err') }, msg.text) : null
        )
      )
    }
