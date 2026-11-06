// ═══ 07-acquire.js · 补料页签组件：缺口队列 + 补料记录 ═══
// （源码文件，编辑后运行 pnpm run build:client 合成 client/client.js）
// ── 模块：components/harvest ──────────────────────────────────────
// 补料页签：HarvestSection（缺口队列）+ SupplyTab。

    // ── 补料 ──────────────────────────────────────────────────────────────
    /**
     * 「从会话提炼」—— wiki_harvest 的触发按键。
     *
     * ── 为什么需要一个按钮 ──
     *
     * 这个插件原本只有两个触发器，都是关于**我们自己失败**的信号（检索未命中、
     * 挣扎）。它们发现不了第三种、也是最值钱的一种：**我们刚刚想清楚了一件事**。
     * 实测过：一次会话里用户亲口说出了一条设计规则，一行都没被沉淀。
     *
     * 模型可以自己调 wiki_harvest，但那要求它**意识到**"刚才那句值得留" ——
     * 而那正是它最容易漏掉的判断。按钮把这个判断交回给人：人知道哪一段值得留。
     *
     * ── 它不动用任何特权 ──
     * 产出照样只落 staged/，固化仍然要人去「知识」页签点。按钮不是免检通道。
     */
    function HarvestSection(props) {
      var lm = (props.state && props.state.llm) || {}
      var last = lm.lastHarvest || null
      var focusState = useState('')
      var focus = focusState[0], setFocus = focusState[1]
      var busyState = useState(false)
      var busy = busyState[0], setBusy = busyState[1]
      var msgState = useState(null)
      var msg = msgState[0], setMsg = msgState[1]
      var used = (lm.lastUsed && lm.lastUsed.harvest) || null
      var siteCfg = (lm.sites && lm.sites.harvest) || null
      var mode = (siteCfg && siteCfg.mode) || lm.mode || 'single'
      var cands = (siteCfg && siteCfg.models) || lm.models || []
      var describe = function (m) { return m.provider + '/' + (m.model || '（该 provider 列出的第一个）') }
      // ★ 必须写出**具体哪个模型**，不能只写"单一模式"。
      //   这个按键按下去就是一次真实的模型调用（花钱、花时间），
      //   而"模式"回答不了"我会问谁"。轮换就把整圈候选都列出来。
      var willAsk = cands.length === 0
        ? '宿主默认模型'
        : (mode === 'rotate'
            ? '轮换 ' + cands.length + ' 个候选（' + cands.map(describe).join('、') + '）'
            : describe(cands[0]))

      var run = function () {
        setBusy(true); setMsg(null)
        post(HARVEST_API, { focus: focus })
          .then(function (r) {
            setBusy(false)
            if (!r.j || !r.j.ok) {
              setMsg({ ok: false, text: '提炼失败：' + (r.error || (r.j && r.j.error) || ('HTTP ' + r.status)) })
              return
            }
            if (r.j.skipped) {
              // 拒绝是**正常结果**，不是错误。措辞必须让人不觉得"失败了"，
              // 否则下一次他会为了凑出一页而去降低标准。
              setMsg({ ok: true, text: '没有值得长期保留的东西：' + r.j.reason + '（这是正常的，拒绝优于写一页没有依据的）' })
            } else {
              setMsg({
                ok: true,
                text: '提炼出 ' + r.j.staged.length + ' 页，已落暂存区'
                  + ((r.j.duplicates && r.j.duplicates.length) ? '，跳过 ' + r.j.duplicates.length + ' 条重复' : '')
                  + '。去「知识」页签固化 —— 固化前不参与召回。',
              })
            }
            props.onChanged && props.onChanged()
          })
      }

      return h('div', { className: 'lw-sec' },
        h('div', { className: 'lw-sec-h' },
          h('span', { className: 'lw-sec-t' }, '从会话提炼'),
          h('span', { className: 'lw-sec-n' }, '第三个触发器：前两个只能发现"我们失败了"，这个发现"我们刚想清楚了一件事"')
        ),
        h('div', { className: 'lw-row' },
          h(Field, {
            className: 'lw-grow',
            placeholder: '只提炼某个方面（可留空，留空则由模型自己判断哪句值得留）',
            value: focus,
            onChange: function (e) { setFocus(e.target.value) },
            disabled: busy,
          }),
          h(Btn, { onClick: run, disabled: busy }, busy ? '提炼中…' : '提炼这段会话')
        ),
        h('div', { className: 'lw-ml-note' },
          '会问：' + willAsk
          + (used ? '　上次实际用：' + used.provider + '/' + used.model : '')
          + '　（在「模型」页签里改）'
        ),
        last
          ? h('div', { className: 'lw-ml-note' },
              '上次：' + when(last.at) + ' · ' + (last.target || '—') + ' · '
              // ★ 取材失败单独说：它和"未产出"不是一回事。
              //   "未产出"是模型看完说"没什么可留的"（正常结论）；
              //   取材失败是**这次提炼根本没跑成**（故障）。
              //   把后者塞进前者的措辞里，等于让人以为功能是好的。
              + (last.failed
                  ? ('取材失败（' + (last.reason || '') + '）—— 这次提炼**没有真的发生**，不是"没什么可留的"')
                  : last.skipped
                    ? ('未产出（' + (last.reason || '') + '）')
                    : ('产出 ' + num(last.staged) + ' 页' + (last.duplicates ? '，重复 ' + num(last.duplicates) : ''))))
          : null,
        msg ? h('div', { className: 'lw-msg ' + (msg.ok ? 'ok' : 'err') }, msg.text) : null
      )
    }

    function SupplyTab(props) {
      var g = props.state.gaps || {}
      var st = props.state.struggles || {}
      var gc = g.counts || {}
      var sc = st.counts || {}
      var sigKeys = Object.keys(sc)
      var maxSig = sigKeys.reduce(function (m, k2) { return Math.max(m, sc[k2]) }, 0)
      var recent = g.recent || []

      return h('div', null,
        h(HarvestSection, props),
        h('div', { className: 'lw-sec' },
          h('div', { className: 'lw-sec-h' },
            h('span', { className: 'lw-sec-t' }, '挣扎信号'),
            h('span', { className: 'lw-sec-n' }, '共 ' + num(st.total) + ' 次记录'),
            // 子代理的那部分单独报。它们记在同一个文件里，但**不产生后果**：
            // 子代理是临时工，它卡住多半说明"我派活的提示词没写好"，
            // 不说明"项目知识不够用"。两者混进同一个数字会让人把结论搞反。
            st.subagent > 0
              ? h('span', {
                  className: 'lw-sec-n',
                  title: '子代理的挣扎只记录：不记嫌疑、不进 gap 队列、不触发联网',
                }, '其中子代理 ' + num(st.subagent) + ' 次（不产生后果）')
              : null,
            h('span', { className: 'lw-sec-n' }, '这才是补料的触发器')
          ),
          sigKeys.length
            ? h('div', { className: 'lw-list' }, sigKeys.map(function (k2) {
                return h(BarRow, {
                  key: k2,
                  name: SIG[k2] || k2,
                  value: sc[k2],
                  max: maxSig,
                  tone: (k2 === 'repeat-failure' || k2 === 'recurring-error') ? 'bad' : null,
                })
              }))
            : h('div', { className: 'lw-empty' }, '还没有挣扎记录。')
        ),
        h('div', { className: 'lw-sec' },
          h('div', { className: 'lw-sec-h' },
            h('span', { className: 'lw-sec-t' }, '缺口队列'),
            h('span', { className: 'lw-sec-n' },
              '待处理 ' + num(gc.pending) + ' · 已产出 ' + num(gc.done)
              + ' · 已跳过 ' + num(gc.skipped) + ' · 放弃 ' + num(gc.abandoned))
          ),
          recent.length ? h('table', { className: 'lw-table' },
            h('colgroup', null,
              h('col', { style: { width: '84px' } }),
              h('col', null)
            ),
            h('thead', null, h('tr', null,
              h('th', { className: 'lw-th' }, '状态'),
              h('th', { className: 'lw-th' }, '查询')
            )),
            h('tbody', null, recent.map(function (x, i) {
              // 状态显示成中文胶囊；原因挂在 title 上（质量闸/蒸馏器为什么拒）。
              var stl = x.status === 'done' ? ['ok', '已产出']
                : x.status === 'pending' ? ['info', '待处理']
                : x.status === 'abandoned' ? ['warn', '放弃']
                : ['dim', '跳过']
              return h('tr', { key: i, className: 'lw-tr' },
                h('td', { className: 'lw-td' },
                  h('span', {
                    className: 'lw-st ' + stl[0],
                    title: x.lastReason ? ('原因：' + x.lastReason) : (x.lastAttempt ? ('上次尝试 ' + when(x.lastAttempt)) : undefined),
                  }, h('span', { className: 'd' }), stl[1])),
                h('td', { className: 'lw-td', title: x.query }, x.query))
            }))
          ) : h('div', { className: 'lw-empty' }, '队列是空的。')
        ),
        h('div', { className: 'lw-sec' },
          h('div', { className: 'lw-sec-h' }, h('span', { className: 'lw-sec-t' }, '最近判定')),
          (st.recent || []).length
            ? h('table', { className: 'lw-table' },
                h('colgroup', null, h('col', { style: { width: '110px' } }), h('col', null)),
                h('thead', null, h('tr', null,
                  h('th', { className: 'lw-th' }, '时间'),
                  h('th', { className: 'lw-th' }, '信号'))),
                h('tbody', null, (st.recent || []).slice().reverse().map(function (r, i) {
                  return h('tr', { key: i, className: 'lw-tr' },
                    h('td', { className: 'lw-td' }, h('span', { className: 'lw-num' }, when(r.ts))),
                    h('td', { className: 'lw-td' }, (r.signals || []).map(function (s) { return SIG[s] || s }).join('、')))
                })))
            : h('div', { className: 'lw-empty' }, '（无）')
        )
      )
    }