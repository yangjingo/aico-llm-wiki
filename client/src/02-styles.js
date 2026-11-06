// ═══ 02-styles.js · 样式：全部 .lw-* CSS（华为红三色体系，spec 05/06） ═══
// （源码文件，编辑后运行 pnpm run build:client 合成 client/client.js）
// ── 模块：style ────────────────────────────────────────────────────
// CSS 字符串（华为红三色体系，docs/spec/05-huawei-redesign.md）与 ensureStyle 注入。
// 原文经 contract 的 exports.__css 交给截图工具。
    // ── 样式 ──────────────────────────────────────────────────────────────
    // 配色：华为红三色体系（docs/spec/05-huawei-redesign.md）。
    // 刻意不走 --dsw-* 主题 token——体系要求「红 + 灰蓝 + 中性灰」固定白底，
    // 跟主题换色会破坏三色纪律。红 #b5333b 只给重点与警示。
    var CSS = [
      '.lw-root{',
      '--lw-fg:#1a1a1c;',
      '--lw-fg2:#585860;',
      '--lw-fg3:#566472;',
      '--lw-fg4:#8a929c;',
      '--lw-line:#d5d9de;',
      '--lw-line-soft:#e7e7e7;',
      '--lw-surface:#ffffff;',
      '--lw-raise:#fafafa;',
      '--lw-hover:#f2f3f5;',
      '--lw-active:#e9ebee;',
      '--lw-brand:#b5333b;',
      '--lw-ok:#566472;',
      '--lw-bad:#b5333b;',
      '--lw-warn:#cf6b72;',
      '--lw-info:#1565c0;',
      // 字体统一挂在这里，其余全部继承。双字体铁律：中文 Noto Sans SC，
      // 数字/英文/mono 小标签 JetBrains Mono（中文绝不能只挂 mono——无中文字形）。
      'font:var(--dsw-font-xs-13,13px/20px \'Noto Sans SC\',sans-serif);',
      'color:var(--lw-fg);caret-color:var(--lw-brand)}',
      // ── 主题组（spec：界面可换肤）──
      // 变量组挂在 .lw-shell[data-theme] 上：比 .lw-root 更内层，级联覆盖
      // 默认组即可，选择器写一处、三种皮肤共用全部布局规则。
      // 三色纪律不变：brand 仍只给重点与警示，只是每个主题换一套色相。
      '.lw-shell[data-theme="morandi"]{',
      '--lw-fg:#3b3e40;--lw-fg2:#666c6a;--lw-fg3:#78807c;--lw-fg4:#9aa29c;',
      '--lw-line:#ccd2cc;--lw-line-soft:#e3e6e1;--lw-surface:#f5f6f2;--lw-raise:#edeee8;',
      '--lw-hover:#e4e7df;--lw-active:#d9ded5;',
      '--lw-brand:#7d8c6f;--lw-ok:#5f7a5a;--lw-bad:#a5614f;--lw-warn:#b08a5e;--lw-info:#5b7a99}',
      '.lw-shell[data-theme="dark"]{',
      '--lw-fg:#e7e8ec;--lw-fg2:#b9bcc4;--lw-fg3:#98a0ab;--lw-fg4:#6d747f;',
      '--lw-line:#3a4048;--lw-line-soft:#2d3239;--lw-surface:#1e2126;--lw-raise:#24282f;',
      '--lw-hover:#2c313a;--lw-active:#343a44;',
      '--lw-brand:#e07a80;--lw-ok:#7fae8a;--lw-bad:#e07a80;--lw-warn:#d9a05e;--lw-info:#6aa6e0}',
      // 这两处原来写死了浅色底（#fdf0f1），换肤会漏——放到原规则处改（见下）。
      '.lw-shell[data-theme="dark"] ::selection{background:rgba(224,122,128,.35)}',
      '.lw-shell[data-theme="morandi"] ::selection{background:rgba(125,140,111,.28)}',
      '.lw-root ::selection{background:rgba(181,51,59,.25)}',
      '.lw-root :focus-visible{outline:2px solid var(--lw-brand);outline-offset:1px;border-radius:6px}',
      '.lw-scroll{scrollbar-width:thin;scrollbar-color:rgba(86,100,114,.35) transparent}',
      '.lw-scroll::-webkit-scrollbar{width:10px;height:10px}',
      '.lw-scroll::-webkit-scrollbar-track{background:transparent}',
      '.lw-scroll::-webkit-scrollbar-thumb{background:rgba(86,100,114,.35);',
      'border-radius:99px;border:3px solid transparent;background-clip:content-box}',
      '.lw-scroll::-webkit-scrollbar-thumb:hover{background:rgba(86,100,114,.55);background-clip:content-box}',
      '.lw-mask{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;',
      'background:rgba(21,23,28,.45)}',
      // 面板自己管布局。这里刻意**不用 DSH 的 Modal 原语**：
      // 它的 .dialog 写死了 width:min(380px,100%)——那是给 RiskConfirmation
      // 这类确认框定的尺寸，把一张 1040px 的数据表塞进去会被压扁。
      // 原语该用在该用的地方：Button / Pill / StateDot / MarkdownText / 图标照用。
      '.lw-panel{width:min(1040px,94vw);height:min(760px,88vh);display:flex;flex-direction:column;overflow:hidden;',
      'padding:16px 18px 0;box-sizing:border-box;',
      'border-radius:14px;border:1px solid var(--lw-line);background:var(--lw-surface);',
      // 阴影也走 DSH 的 token。原来写死 rgba(0,0,0,.20/.36) —— 深色主题下
      // 黑色阴影几乎看不见，而浅色主题下它又偏重，两边都不跟主题。
      // 字面值退到 var() 的回退位里（那也是本文件里唯一允许出现字面色值的地方）。
      'box-shadow:0 1px 2px rgba(0,0,0,.08),0 16px 48px rgba(0,0,0,.18)}',
      '.lw-shell{display:flex;flex-direction:column;flex:1;min-height:0;width:100%}',
      '.lw-head{display:flex;align-items:center;gap:9px;padding:0 0 12px}',
      '.lw-headicon{display:flex;align-items:center;color:var(--lw-brand)}',
      '.lw-title{font:var(--dsw-font-s-strong-14,600 14px/22px \'Noto Sans SC\',sans-serif)}',
      '.lw-tabs{display:flex;align-items:center;gap:6px;padding:0 0 10px;border-bottom:1px solid var(--lw-line-soft);flex-wrap:wrap}',
      '.lw-tabsum{margin-left:auto;font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);color:var(--lw-fg3);font-variant-numeric:tabular-nums}',
      // ── 二级界面骨架（spec 05 重绘）：左目录 + 右内容 ──
      '.lw-work{display:flex;flex:1;min-height:0}',
      '.lw-nav{width:212px;flex:none;border-right:1px solid var(--lw-line-soft);padding:6px 0 12px;overflow:auto;display:flex;flex-direction:column}',
      // 侧边栏底部的知识库路径：margin-top:auto 把它钉到最下（导航短时），
      // 导航长时随内容滚——反正它只是"我连的是哪个库"的备注。
      // 侧边栏底部三件套：主题 / 换库 / 路径。margin-top:auto 把整块钉到最下
      // （导航短时），导航长时随内容滚——它们都是"我在哪、连的哪个库"的备注。
      '.lw-sidebottom{margin-top:auto;padding:14px 12px 0 15px;display:flex;flex-direction:column;gap:8px}',
      '.lw-siderow{display:flex;align-items:center;gap:8px}',
      '.lw-sidelabel{flex:none;font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);color:var(--lw-fg4);letter-spacing:.12em}',
      '.lw-sidebottom .lw-sel{flex:1;min-width:0;max-width:none}',
      '.lw-sidepath{font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);color:var(--lw-fg4);font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      // 换库入口：折叠态是一行"库 + 路径"的按钮，点开展开成输入框。
      '.lw-rootswitch{display:flex;align-items:center;gap:6px;width:100%;padding:4px 6px;border:1px solid var(--lw-line-soft);',
      'border-radius:7px;background:transparent;cursor:pointer;font:inherit;text-align:left}',
      '.lw-rootswitch:hover{border-color:var(--lw-line);background:var(--lw-hover)}',
      '.lw-rootswitch-n{flex:none;font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);color:var(--lw-fg4);letter-spacing:.12em}',
      '.lw-rootswitch-p{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
      'font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);color:var(--lw-fg3);font-variant-numeric:tabular-nums}',
      '.lw-rootswitch-edit{display:flex;flex-direction:column;gap:6px}',
      '.lw-rootswitch-edit .lw-input{width:100%;min-width:0;font-size:11px}',
      '.lw-rootswitch-acts{display:flex;gap:6px}',
      // 换库目录选择弹窗：自绘小面板，列表区可滚动，底部操作行。
      '.lw-rootpicker{width:min(460px,92vw);display:flex;flex-direction:column;gap:10px;padding:14px 16px;',
      'box-sizing:border-box;border-radius:14px;border:1px solid var(--lw-line);background:var(--lw-surface);',
      'box-shadow:0 1px 2px rgba(0,0,0,.08),0 16px 48px rgba(0,0,0,.18);color:var(--lw-fg)}',
      '.lw-rootpicker-head{display:flex;align-items:center;justify-content:space-between;',
      'font:var(--dsw-font-s-strong-14,600 14px/22px \'Noto Sans SC\',sans-serif)}',
      '.lw-rootpicker-path{font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);color:var(--lw-fg3);',
      'font-variant-numeric:tabular-nums;padding:6px 8px;border:1px dashed var(--lw-line-soft);border-radius:7px;',
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left}',
      '.lw-rootpicker-err{font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);color:var(--lw-bad)}',
      '.lw-rootpicker-list{min-height:180px;max-height:min(320px,44vh);overflow:auto;display:flex;flex-direction:column;gap:2px;',
      'border:1px solid var(--lw-line-soft);border-radius:8px;padding:4px}',
      '.lw-rootpicker-item{display:block;width:100%;padding:7px 9px;border:0;border-radius:6px;background:none;cursor:pointer;',
      'font:var(--dsw-font-xs-13,13px/20px \'Noto Sans SC\',sans-serif);color:var(--lw-fg2);text-align:left;overflow:hidden;',
      'text-overflow:ellipsis;white-space:nowrap}',
      '.lw-rootpicker-item:hover{background:var(--lw-hover);color:var(--lw-fg)}',
      '.lw-rootpicker-item:focus-visible{outline:2px solid var(--lw-brand);outline-offset:-2px}',
      '.lw-rootpicker-empty{padding:18px 10px;text-align:center;color:var(--lw-fg4);',
      'font:var(--dsw-font-xs-13,13px/20px \'Noto Sans SC\',sans-serif)}',
      '.lw-rootpicker-acts{display:flex;align-items:center;gap:6px}',
      '.lw-rootpicker-sp{flex:1}',
      '.lw-rootpicker-ok{color:var(--lw-brand);border-color:var(--lw-brand)}',
      '.lw-nav-grp{font-family:\'JetBrains Mono\',\'Noto Sans SC\',ui-monospace,monospace;font-size:11px;',
      'letter-spacing:.18em;color:var(--lw-fg4);padding:14px 18px 6px}',
      '.lw-nav-item{display:flex;align-items:center;gap:10px;width:100%;padding:10px 16px 10px 15px;border:0;',
      'border-left:3px solid transparent;background:none;cursor:pointer;font:inherit;font-size:14px;',
      'color:var(--lw-fg2);text-align:left}',
      '.lw-nav-item:hover{background:var(--lw-hover)}',
      '.lw-nav-item:focus-visible{outline:2px solid var(--lw-brand);outline-offset:-2px}',
      '.lw-nav-item.cur{color:var(--lw-fg);font-weight:600;border-left-color:var(--lw-brand);background:color-mix(in srgb,var(--lw-brand) 8%,transparent)}',
      '.lw-nav-n{font-family:\'JetBrains Mono\',\'Noto Sans SC\',ui-monospace,monospace;font-size:12px;color:var(--lw-fg4);width:20px;flex:none}',
      '.lw-nav-item.cur .lw-nav-n{color:var(--lw-brand)}',
      '.lw-nav-l{flex:1;min-width:0}',
      '.lw-nav-badge{font-family:\'JetBrains Mono\',\'Noto Sans SC\',ui-monospace,monospace;font-size:11px;',
      'background:color-mix(in srgb,var(--lw-brand) 8%,transparent);color:var(--lw-brand);border-radius:99px;padding:1px 8px;flex:none}',
      '.lw-main{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;padding:2px 0 0 20px}',
      '.lw-crumb{font-size:12px;color:var(--lw-fg4);margin-bottom:10px}',
      '.lw-crumb b{color:var(--lw-brand);font-weight:600}',
      '.lw-h3{margin:0 0 4px;font:600 24px/1.35 \'Noto Sans SC\',sans-serif;color:var(--lw-fg)}',
      '.lw-h3 .r{color:var(--lw-brand)}',
      '.lw-kpirow{display:flex;gap:12px;margin:14px 0 18px;flex-wrap:wrap}',
      '.lw-kpi{flex:1;min-width:96px;background:var(--lw-raise);border:1px solid var(--lw-line-soft);',
      'border-radius:12px;padding:10px 14px}',
      '.lw-kpi-n{font-family:\'JetBrains Mono\',\'Noto Sans SC\',ui-monospace,monospace;font-size:26px;',
      'font-weight:700;color:var(--lw-fg);line-height:1.1;display:flex;align-items:center;gap:7px}',
      '.lw-kpi-n.r{color:var(--lw-brand)}',
      '.lw-kpi-l{font-size:12px;color:var(--lw-fg2);margin-top:3px}',
      // KPI 格是 button 时重置浏览器默认样式，并给"能按"的手感。
      'button.lw-kpi{font:inherit;color:inherit;text-align:left;cursor:pointer;transition:border-color .15s,box-shadow .15s}',
      'button.lw-kpi:hover{border-color:var(--lw-brand);box-shadow:0 1px 6px rgba(0,0,0,.08)}',
      'button.lw-kpi:focus-visible{outline:2px solid var(--lw-brand);outline-offset:1px}',
      // ── 知识页签：目录树 + 表格两栏（spec 06 修订）──
      '.lw-kn{display:flex;gap:16px;min-height:0;align-items:flex-start}',
      '.lw-kn-main{flex:1;min-width:0}',
      '.lw-tree{flex:none;width:236px;border:1px solid var(--lw-line-soft);border-radius:12px;',
      'background:var(--lw-raise);padding:10px 6px;max-height:560px;overflow:auto}',
      '.lw-tree-h{font:600 13px/20px \'Noto Sans SC\',sans-serif;padding:2px 8px 8px;display:flex;align-items:baseline}',
      '.lw-tree-dir{display:flex;align-items:center;gap:5px;width:100%;border:0;background:none;',
      'cursor:pointer;font:inherit;font-size:12.5px;color:var(--lw-fg2);padding:5px 6px;text-align:left;border-radius:6px}',
      '.lw-tree-dir:hover{background:var(--lw-hover)}',
      '.lw-tree-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.lw-tree-leaf{display:flex;align-items:center;gap:2px}',
      '.lw-tree-file{display:flex;align-items:center;gap:6px;flex:1;min-width:0;border:0;background:none;',
      'cursor:pointer;font:inherit;font-size:12.5px;color:var(--lw-fg);padding:4px 6px;text-align:left;border-radius:6px}',
      '.lw-tree-file:hover{background:var(--lw-hover)}',
      '.lw-tree-dot{width:8px;height:8px;border-radius:99px;flex:none}',
      '.lw-tree-dot.fact{background:#b5333b}.lw-tree-dot.decision{background:#1565c0}',
      '.lw-tree-dot.lesson{background:#566472}.lw-tree-dot.howto{background:#cf6b72}',
      '.lw-tree-goto{flex:none;border:1px solid var(--lw-line);background:none;color:var(--lw-fg3);',
      'font-size:11px;border-radius:6px;padding:1px 6px;cursor:pointer}',
      '.lw-tree-goto:hover{color:var(--lw-brand);border-color:var(--lw-brand)}',
      // 窄面板（模态/分屏）：目录塌成横条，红高亮移到底边。
      '@media (max-width:760px){.lw-work{flex-direction:column}',
      '.lw-nav{width:auto;display:flex;overflow-x:auto;border-right:0;border-bottom:1px solid var(--lw-line-soft)}',
      '.lw-nav-grpwrap{display:flex;align-items:center}.lw-nav-grp{display:none}',
      // 窄屏下侧边栏变成横向条，底部三件套不再适合塞在里面。
      '.lw-sidebottom{display:none}',
      '.lw-nav-item{width:auto;white-space:nowrap;border-left:0;border-bottom:3px solid transparent}',
      '.lw-nav-item.cur{border-bottom-color:var(--lw-brand)}}',
      '.lw-body{flex:1;min-height:0;overflow:auto;padding:12px 0 18px}',
      // 页签之下的第二级导航（能力页签里的 工具/技能）。
      // 用一条浅底把两段"焊"在一起，跟顶部页签一眼可分——否则两级导航长得一样，
      // 你分不清哪一层换的是整页、哪一层只换下半页。
      '.lw-seg{display:inline-flex;align-items:center;gap:2px;margin:0 0 14px;padding:2px;border-radius:9px;',
      'background:var(--lw-raise);border:1px solid var(--lw-line-soft)}',
      '.lw-seg>*{border:0!important}',
      '.lw-sec{margin:0 0 20px}',
      '.lw-sec-h{display:flex;align-items:baseline;gap:8px;margin:0 0 8px;flex-wrap:wrap}',
      '.lw-sec-t{font:var(--dsw-font-xxs-strong-12,600 12px/18px \'Noto Sans SC\',sans-serif)}',
      '.lw-sec-n{font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);color:var(--lw-fg3);font-variant-numeric:tabular-nums}',
      '.lw-note{font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);line-height:1.6;color:var(--lw-fg3);margin:6px 0 0}',
      '.lw-table{width:100%;border-collapse:collapse;table-layout:fixed}',
      // 表头 = 标准表格语汇：品牌红底 + 白字居中粗体（独立于卡片的浅灰边框体系）。
      '.lw-th{position:sticky;top:0;z-index:2;text-align:center;font:var(--dsw-font-xxxs-strong-11,700 11px/16px \'Noto Sans SC\',sans-serif);color:#fff;',
      'padding:6px 8px;background:#b5333b;white-space:nowrap}',
      '.lw-th.r,.lw-td.r{text-align:right}',
      '.lw-td{padding:7px 8px;vertical-align:middle}',
      '.lw-tr.x{cursor:pointer}',
      '.lw-tr.x:hover>.lw-td{background:var(--lw-hover)}',
      '.lw-tr.x[aria-expanded="true"]>.lw-td{background:var(--lw-active)}',
      '.lw-td.detail{padding:0;white-space:normal;background:var(--lw-raise)}',
      '.lw-num{font-variant-numeric:tabular-nums;color:var(--lw-fg2)}',
      '.lw-id{font-family:\'JetBrains Mono\',\'Noto Sans SC\',ui-monospace,monospace}',
      '.lw-src{font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);font-family:\'JetBrains Mono\',\'Noto Sans SC\',ui-monospace,monospace;color:var(--lw-fg3)}',
      // 双行单元格：主行是标识符，副行是用途。列仍然是固定的，只是行变高了。
      '.lw-2l{display:flex;flex-direction:column;gap:1px;min-width:0;white-space:normal}',
      '.lw-sub{font:var(--dsw-font-xxxs-11,11px/15px \'Noto Sans SC\',sans-serif);color:var(--lw-fg4)}',
      // 工具名 + 行内状态标记。状态写在行里，不靠位置表达——
      // 位置一旦随勾选变化，就没法连续点第二下了。
      '.lw-name{font-family:\'JetBrains Mono\',\'Noto Sans SC\',ui-monospace,monospace;',
      'display:inline-flex;align-items:center;gap:6px;min-width:0}',
      '.lw-off{font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);line-height:15px;padding:0 5px;',
      'color:var(--lw-fg4);flex:none}',
      // 族分组标题。族说一次就够，不必在每一行重复。
      '.lw-group>.lw-td{padding:12px 8px 4px;background:transparent;',
      'position:sticky;top:22px;z-index:1;background:var(--lw-surface)}',
      '.lw-group-name{font:var(--dsw-font-xxxs-strong-11,600 11px/16px \'Noto Sans SC\',sans-serif);color:var(--lw-fg2);',
      'font-family:\'JetBrains Mono\',\'Noto Sans SC\',ui-monospace,monospace}',
      '.lw-group-n{margin-left:8px;font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);color:var(--lw-fg4)}',
      // 族标题是**真的按钮**：键盘可达、有 aria-expanded。
      // 折叠控件用 div 是常见的偷懒，代价是键盘用户用不了。
      '.lw-groupbtn{display:inline-flex;align-items:baseline;gap:2px;padding:2px 6px;margin:0 0 0 -6px;',
      'border:0;border-radius:6px;background:none;color:inherit;cursor:pointer;font:inherit;text-align:left}',
      '.lw-groupbtn:hover{background:var(--lw-hover)}',
      '.lw-groupbtn:focus-visible{outline:2px solid var(--lw-brand);outline-offset:1px}',
      '.lw-group-chev{flex:none;width:12px;color:var(--lw-fg3);font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif)}',
      // 展开控件：一个去掉了所有默认外观的 button。
      // 它必须**看得见焦点**——键盘用户靠它知道自己在哪一格上。
      '.lw-chevbtn{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;padding:0;',
      'border:0;border-radius:5px;background:transparent;color:inherit;cursor:pointer;font:inherit}',
      '.lw-chevbtn:hover{background:var(--lw-hover)}',
      '.lw-chev{display:inline-flex;align-items:center;color:var(--lw-fg4);transition:transform .12s ease}',
      '.lw-chev.c{transform:rotate(-90deg)}',
      '.lw-dot{display:inline-block;width:8px;height:8px;border-radius:99px;background:var(--lw-fg4)}',
      '.lw-dot-done{background:var(--lw-ok)}.lw-dot-error{background:var(--lw-bad)}',
      '.lw-dot-ongoing{background:var(--lw-info)}.lw-dot-idle{background:var(--lw-fg4)}',
      '.c-ok{color:var(--lw-ok)}.c-bad{color:var(--lw-bad)}.c-warn{color:var(--lw-warn)}',
      '.c-info{color:var(--lw-info)}.c-dim{color:var(--lw-fg4)}.c-2{color:var(--lw-fg2)}.c-3{color:var(--lw-fg3)}',
      '.lw-exp{padding:12px 14px 16px;border-bottom:1px solid var(--lw-line-soft);line-height:1.65}',
      '.lw-meta{display:flex;flex-wrap:wrap;gap:5px 14px;font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);color:var(--lw-fg3);',
      'font-variant-numeric:tabular-nums;margin:0 0 10px}',
      '.lw-srclist{margin:10px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px}',
      '.lw-srclist li{display:flex;align-items:center;gap:6px;min-width:0}',
      '.lw-srclist a{color:var(--lw-info);text-decoration:none}',
      '.lw-srclist a:hover{text-decoration:underline}',
      // 溯源 chips（spec 06 修订）：类型徽标 + 短值；类型色走三色体系。
      '.lw-srcline{display:inline-flex;gap:4px;align-items:center;min-width:0;flex-wrap:wrap}',
      '.lw-srcchip{font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);color:var(--lw-fg2)}',
      '.lw-src-session{color:#b5333b}',
      '.lw-src-doc{color:#566472}',
      '.lw-src-url{color:#1565c0}',
      'a.lw-srcchip:hover{background:color-mix(in srgb,var(--lw-brand) 8%,transparent)}',
      // 文档类 chip 可点击（打开本地源文件），给一点"能按"的手感。
      'a.lw-src-doc{cursor:pointer}',
      // 打开动作的轻提示：不出对话框，右下角冒一条、3 秒自灭。
      '.lw-toast{position:fixed;right:18px;bottom:18px;z-index:99999;max-width:420px;',
      'padding:8px 14px;border-radius:8px;border:1px solid var(--lw-line);background:var(--lw-surface);',
      'color:var(--lw-fg);font:var(--dsw-font-xs-12,12px/18px \'Noto Sans SC\',sans-serif);box-shadow:0 4px 16px rgba(0,0,0,.18)}',
      '.lw-toast-bad{color:var(--lw-bad)}',
      '.lw-pre{margin:0;white-space:pre-wrap;word-break:break-word;color:var(--lw-fg2);',
      'font:var(--dsw-font-markdown-code-block-small,12px/18px ui-monospace,monospace);max-height:340px;overflow:auto}',
      '.lw-bar{display:flex;align-items:center;gap:9px;margin:0 0 10px;flex-wrap:wrap}',
      '.lw-field{flex:1;min-width:150px;display:flex;align-items:center}',
      '.lw-input{box-sizing:border-box;flex:1;min-width:150px;padding:5px 9px;border-radius:7px;',
      'border:1px solid var(--lw-line);background:transparent;color:var(--lw-fg);font:inherit}',
      '.lw-input::placeholder{color:var(--lw-fg4)}',
      '.lw-chip{font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);padding:1px 7px;border-radius:99px;color:var(--lw-fg2);white-space:nowrap}',
      '.lw-chip.lw-on{color:var(--lw-fg)}',
// 状态胶囊：给「状态」这一类事实一个统一的视觉语言（点 + 底色 + 描边），
// 颜色取自语义 token；跳过/已产出/待处理/放弃 一眼可辨，不必读文字。
'.lw-st{display:inline-flex;align-items:center;gap:5px;padding:1px 8px;border-radius:99px;border:1px solid var(--lw-line);font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);white-space:nowrap;color:var(--lw-fg2)}',
'.lw-st .d{width:6px;height:6px;border-radius:99px;background:currentColor;opacity:.85;flex:none}',
'.lw-st.ok{color:var(--lw-ok);border-color:color-mix(in srgb,var(--lw-ok) 32%,transparent);background:color-mix(in srgb,var(--lw-ok) 9%,transparent)}',
'.lw-st.warn{color:var(--lw-warn);border-color:color-mix(in srgb,var(--lw-warn) 32%,transparent);background:color-mix(in srgb,var(--lw-warn) 9%,transparent)}',
'.lw-st.bad{color:var(--lw-bad);border-color:color-mix(in srgb,var(--lw-bad) 32%,transparent);background:color-mix(in srgb,var(--lw-bad) 9%,transparent)}',
'.lw-st.info{color:var(--lw-info);border-color:color-mix(in srgb,var(--lw-info) 32%,transparent);background:color-mix(in srgb,var(--lw-info) 9%,transparent)}',
'.lw-st.dim{color:var(--lw-fg4);background:var(--lw-raise)}',
      '.lw-msg{font:var(--dsw-font-xxs-12,12px/18px \'Noto Sans SC\',sans-serif);line-height:1.5;padding:8px 10px;border-radius:8px;margin:0 0 12px}',
      '.lw-msg.ok{color:var(--lw-ok);border:1px solid var(--lw-line)}',
      '.lw-msg.err{color:var(--lw-bad);border:1px solid var(--lw-line)}',
      '.lw-empty{font:var(--dsw-font-xxs-12,12px/18px \'Noto Sans SC\',sans-serif);line-height:1.6;color:var(--lw-fg4);padding:14px 2px}',
      '.lw-list{display:flex;flex-direction:column;gap:7px}',
      '.lw-lrow{display:flex;align-items:center;gap:10px;font:var(--dsw-font-xxs-12,12px/18px \'Noto Sans SC\',sans-serif)}',
      '.lw-lname{width:140px;flex:none;color:var(--lw-fg2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.lw-track{flex:1;height:6px;border-radius:99px;background:var(--lw-line-soft);overflow:hidden}',
      '.lw-fill{height:100%;border-radius:99px;background:var(--lw-brand);opacity:.85}',
      '.lw-fill.warn{background:var(--lw-warn)}.lw-fill.bad{background:var(--lw-bad)}',
      '.lw-lval{width:58px;flex:none;text-align:right;font-variant-numeric:tabular-nums;color:var(--lw-fg2)}',
      // ── 侧边栏底栏入口（座位 sidebar.footer.action）──
      //
      // 这个座位是个**行**（.pKYZ4q_footerActions{display:flex}），而它的第一个
      // 使用者 —— cordis 面板 —— 声明了 flex:none;width:100%，一个人就把整行占满。
      // 宿主那行不换行，于是**任何**第二个使用者都会被挤出容器：实测单元格落在
      // x=228（容器是 12..228）、宽度被压到 83px、标签折成两行。
      // 让宿主那行允许换行，两个使用者就各占一行，谁都不必去抢别人的宽度。
      // 用 :has() 从我的单元格往上选，所以不依赖宿主那个构建期哈希类名；
      // 轨道态下容器是 width:auto，两个 36px 单元格本来就放得下，不会换行。
      '*:has(> .lw-fb-cell){flex-wrap:wrap}',
      // 单元格 = 宿主的 flex 子项。宽态给满，轨道态收成 36px 方格。
      '.lw-fb-cell{flex:none;width:100%;min-width:0;display:flex}',
      '.lw-fb-cell-rail{width:36px}',
      // 按钮照抄设置行（.Ri3YFq_trigger）的度量：高 34px、圆角 12px、
      // width:calc(100% + 8px) + margin:4px -4px 让它比列宽出 4px（设置行正是这么做的）。
      // 于是 padding-left 10px 减掉那 4px = 图标左沿距列边 6px —— 与设置行、
      // 与 cordis 单元格在同一条竖线上（那两处也都是 6px）。
      '.lw-fb{box-sizing:border-box;display:flex;align-items:center;gap:8px;',
      'width:calc(100% + 8px);height:34px;margin:4px -4px;padding:6px 2px 6px 10px;',
      'border:0;border-radius:12px;background:transparent;color:inherit;font:inherit;cursor:pointer;',
      'text-align:left;overflow:hidden}',
      '.lw-fb:hover{background:var(--lw-hover)}',
      // 标签必须能自己收窄，否则长文案会把整行顶宽。
      '.lw-fb-label{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      // 轨道态（wide=false，56px 栏）：和 cordis 单元格、设置圆钮一样是 36px 圆。
      // 标签让位 —— 36px 里塞不下字，同样的信息 title 里写着。
      '.lw-fb-rail{width:36px;height:36px;margin:0;padding:0;border-radius:50%;justify-content:center;gap:0;position:relative}',
      // 轨道态没有标签，待办数改成一个不越出圆的小点：收起侧边栏不该等于
      // "看不见有事在等"。数字仍在 title 里。
      '.lw-fb-rail .lw-fb-dot{position:absolute;top:6px;right:6px;min-width:6px;width:6px;height:6px;padding:0;font-size:0;line-height:0}',
      '.lw-fb-badge{margin-left:auto;font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);color:var(--lw-fg4);font-variant-numeric:tabular-nums}',
      // ── 待办计数角标 ──
      //
      // ★ 配色**必须**用 DSH 的按钮 token 成对出现，不能自己配 "#fff 压深色底"。
      //   原先写死 color:#fff 就是"字体与按钮同色、完全不可见"的原因：
      //   --dsw-alias-button-primary-fill 在浅色主题下不是深色，
      //   白字压上去等于没字。DSH 自己给的配对是
      //   background=button-primary-fill / color=label-primary-foreground。
      '.lw-fb-dot{flex:none;min-width:16px;height:16px;padding:0 5px;border-radius:99px;box-sizing:border-box;',
      'display:inline-flex;align-items:center;justify-content:center;',
      'background:var(--dsw-alias-button-primary-fill,var(--lw-brand));',
      'color:var(--dsw-alias-label-primary-foreground,#fff);',
      'font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);font-variant-numeric:tabular-nums}',
      // ── 输入框上方的待办条 ──
      //
      // 三层约束，缺一条都会"看着不对"：
      //
      // 1) **宽度**：座位 conversation.input.dock 是**整行宽**的
      //    （catalog 原话：a full-width row of its own —— 而且它点名 "a todo strip"
      //     就是这个用途）。所以要自己收到和输入框一样宽，否则会横跨整个对话区。
      //    780px 不是我拍的：DSH 自己的 --dsh-composer-card-max-width
      //    = --dsh-chat-content-width(748) + 32。直接用它的变量，它改我跟着改。
      // 2) **外观**：照抄 DSH 自己在这个位置的样式 ._5M8isa_notice
      //    （composer 卡片上方的一条提示）—— 同一位置、同一宽度、同一字号，
      //    没有理由另造一套。
      // 3) **按钮**：逐条照抄 DSH 的 Button CSS 模块（kz6gm），
      //    包括 primary 的配色配对与 disabled 的 opacity:.4。
      //    自己发明配色正是"按钮未与主题同步"的来源。
      //
      // ★ 另外：这个条子挂在 composer 里，离 .lw-root 很远 —— 而整套 --lw-* 变量是
      //   定义在 .lw-root 上的，不是 :root。所以组件上必须**同时带 lw-root 类**，
      //   否则这里每一个 var(--lw-*) 都是未定义（无回退值时整条声明失效）。
      // 宽度用的是**和输入框卡片完全相同的公式**，不是"差不多"：
      //   卡片 = min(容器宽 - 2*side-clearance, card-max-width)
      // 只写 max-width 的话，窄屏下条子会比卡片宽出两个 side-clearance（32px），
      // 而那正是"没对齐"看起来最刺眼的地方。
      // ── AICO 待办卡（spec：会话框提示条一体化品牌设计）──
      // 之前是"一行灰底 + 两个胶囊 + 一个按钮"，像系统通知，不像产品。
      // 现在是一张**AICO 卡片**：品牌字标 + 渐变印章 + 品牌色描边，
      // 让人一眼认出这是 aico-wiki 在说话，而不是宿主在报错。
      // 全部走 --lw-* 变量：换肤（莫兰迪/深色）时品牌色自动跟随。
      '.lw-pend{box-sizing:border-box;width:calc(100% - 2 * var(--dsh-composer-side-clearance,16px));',
      'max-width:var(--dsh-composer-card-max-width,780px);',
      // ★ 总高上限是底线：确认态带审核清单，内容想多高有多高，而 dock 座位
      //   是按一行给的高度——不限高的话多出来的部分被容器切掉，圆角底边和
      //   下边距全部消失（实测溢出）。限高后滚动发生在卡片**内部**，
      //   底边（描边+圆角+投影）永远完整可见。
      'max-height:min(46vh,360px);overflow:hidden;',
      'display:flex;align-items:flex-start;gap:10px;flex-wrap:nowrap;margin:0 auto 10px;padding:7px 10px 9px 8px;',
      'border-radius:12px;',
      'border:1px solid color-mix(in srgb,var(--lw-brand) 24%,transparent);',
      'background:linear-gradient(90deg,color-mix(in srgb,var(--lw-brand) 8%,var(--lw-surface)) 0%,var(--lw-surface) 52%);',
      'box-shadow:0 2px 12px color-mix(in srgb,var(--lw-brand) 12%,transparent);',
      'color:var(--dsw-alias-label-secondary,var(--lw-fg2));',
      'font:var(--dsw-font-xxs-12,12px/18px \'Noto Sans SC\',sans-serif)}',
      // AICO 印章：品牌色渐变的圆角方块 + 单字。识别符号，不承担信息。
      '.lw-pend-mark{flex:none;display:flex;align-items:center;justify-content:center;width:30px;height:30px;',
      'border-radius:9px;color:#fff;font-weight:700;font-size:15px;',
      'background:linear-gradient(135deg,var(--lw-brand) 0%,color-mix(in srgb,var(--lw-brand) 52%,#1a1a1c) 130%);',
      'box-shadow:inset 0 1px 0 color-mix(in srgb,#fff 28%,transparent)}',
      // 主区：品牌名一行 + 待办一行。品牌名与文字钉在顶部，滚动只发生在清单里。
      // ★ min-height:0 是 flex 列里滚动能成立的前提——没有它子内容撑破上限。
      '.lw-pend-main{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;gap:1px;overflow:hidden}',
      '.lw-pend-brand{flex:none;font:var(--dsw-font-xxxs-strong-11,700 10px/14px \'Noto Sans SC\',sans-serif);',
      'letter-spacing:.22em;color:var(--lw-brand);user-select:none}',
      '.lw-pend-txt{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.lw-pend b{color:var(--lw-brand);font-variant-numeric:tabular-nums;font-weight:700}',
      // 计数是可点的入口，但**不要**做成虚线下划线 —— 一行里两条虚线下划线很吵。
      // 做成安静的小胶囊：平时看着就是文字，悬停才显出可点（品牌色淡底）。
      '.lw-pend-chip{flex:none;padding:0 6px;margin:0 -2px;border:0;border-radius:6px;background:none;',
      'color:inherit;cursor:pointer;font:inherit;white-space:nowrap}',
      '.lw-pend-chip:hover{background:color-mix(in srgb,var(--lw-brand) 9%,transparent);',
      'color:var(--dsw-alias-label-primary,var(--lw-fg))}',
      '.lw-pend-chip:focus-visible{outline:2px solid var(--lw-brand);outline-offset:1px}',
      // 卡片里的主按钮走 **AICO** 的品牌色，不吃宿主的蓝色 primary——
      // 否则"全部固化"是蓝的，卡片是红的，一张卡上两套品牌打架。
      '.lw-pend .lw-btn.primary{border-color:transparent;background:var(--lw-brand);color:#fff;',
      'box-shadow:0 1px 6px color-mix(in srgb,var(--lw-brand) 30%,transparent)}',
      '.lw-pend .lw-btn.primary:hover:not(:disabled){background:color-mix(in srgb,var(--lw-brand) 86%,#1a1a1c)}',
      '.lw-pend .lw-btn{height:26px}',
      // 确认态的逐页审核清单：卡片向下生长，列表自身限高滚动。
      // 确认态的逐页审核清单：清单是卡片里唯一滚动的地方（flex:1 + min-height:0
      // 吃掉主区剩余高度），品牌行/文字/按钮全部钉死——底边永远不会被顶没。
      '.lw-pend-list{flex:1;min-height:0;margin-top:5px;display:flex;flex-direction:column;gap:3px;overflow:auto;',
      'scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--lw-brand) 30%,transparent) transparent}',
      '.lw-pend-item{border:1px solid color-mix(in srgb,var(--lw-brand) 14%,transparent);border-radius:8px;background:var(--lw-surface)}',
      '.lw-pend-itemhead{display:flex;align-items:center;gap:6px;width:100%;padding:3px 8px;border:0;background:none;',
      'cursor:pointer;font:inherit;text-align:left;color:var(--dsw-alias-label-secondary,var(--lw-fg2))}',
      '.lw-pend-itemhead:hover{background:color-mix(in srgb,var(--lw-brand) 6%,transparent)}',
      '.lw-pend-itemhead:focus-visible{outline:2px solid var(--lw-brand);outline-offset:-2px}',
      '.lw-pend-itemdot{flex:none;color:var(--lw-brand);font-size:8px;line-height:1}',
      '.lw-pend-itemdot.off{color:var(--lw-fg4)}',
      '.lw-pend-itemtitle{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
      'color:var(--dsw-alias-label-primary,var(--lw-fg))}',
      '.lw-pend-itemconf,.lw-pend-itemcat{flex:none;font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);',
      'color:var(--lw-fg4);font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.lw-pend-itemcat{padding:0 5px;border:1px solid var(--lw-line);border-radius:99px}',
      '.lw-pend-itemchev{flex:none;font-size:11px;color:var(--lw-brand);white-space:nowrap}',
      '.lw-pend-itembody{padding:5px 9px 8px;border-top:1px solid var(--lw-line-soft);font-size:11.5px;line-height:1.6}',
      '.lw-pend-preview{color:var(--lw-fg2);white-space:pre-wrap;word-break:break-word;max-height:140px;overflow:auto}',
      '.lw-pend-srcline{margin-top:4px;display:flex;flex-wrap:wrap;gap:3px 8px;font-size:11px;align-items:center}',
      '.lw-pend-srcline a{color:var(--lw-info);cursor:pointer;text-decoration:none}',
      '.lw-pend-srcline a:hover{text-decoration:underline}',
      // Button(sm)：display/gap/height/padding/圆角/字号全部照 DSH 的 kz6gm 模块。
      // 分拣页签复用同一个类 —— 两处外观必须是同一套，否则又是一个"没同步"。
      '.lw-btn{flex:none;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;',
      'gap:4px;height:28px;padding:0 10px;border-radius:14px;cursor:pointer;',
      'border:1px solid var(--dsw-alias-border-l2);background:transparent;',
      'color:var(--dsw-alias-label-primary,var(--lw-fg));',
      'font:var(--dsw-font-xxs-12,12px/18px \'Noto Sans SC\',sans-serif)}',
      // ghost/outline 的悬停与按下
      '.lw-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.lw-btn:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}',
      // primary：配对使用 fill / foreground，绝不自己配白字
      '.lw-btn.primary{border-color:transparent;',
      'background:var(--dsw-alias-button-primary-fill,var(--lw-brand));',
      'color:var(--dsw-alias-label-primary-foreground,#fff)}',
      '.lw-btn.primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover,var(--lw-brand))}',
      '.lw-btn.primary:active:not(:disabled){background:var(--dsw-alias-button-primary-hover,var(--lw-brand))}',
      '.lw-btn:disabled{cursor:not-allowed;opacity:.4}',
      // ── 右上角「关闭」拉条开关（对齐 aida-lld pull-to-close）────────────
      // 一条带滑块的轨道：真实拖拽（跟手，松手过半程关闭/否则 spring 回弹）
      // 或单击直接 armed；armed 后整页播退场编排再 close。曲线与几何
      // 照抄 aida-lld styles.ts 的 .aida-lld-pull 族，类名前缀换 lw-。
      '.lw-head .lw-pull{flex:none;margin-left:auto;display:flex;align-items:center;gap:8px;height:30px;padding:0 4px 0 10px;border-radius:999px;cursor:pointer;user-select:none;touch-action:none;outline:none}',
      '.lw-pull:focus-visible .lw-pull-track{outline:2px solid var(--dsw-alias-brand-primary,#2563eb);outline-offset:2px}',
      '.lw-pull-label{min-width:44px;text-align:right;font-size:11px;font-weight:500;line-height:14px;letter-spacing:.06em;',
      'color:var(--dsw-alias-label-secondary,var(--lw-fg3));',
      'transition:color 260ms cubic-bezier(.32,.72,0,1),opacity 260ms cubic-bezier(.32,.72,0,1)}',
      '.lw-pull:hover .lw-pull-label{color:var(--dsw-alias-label-primary,var(--lw-fg))}',
      '.lw-pull.lw-pull-armed .lw-pull-label{color:var(--dsw-alias-brand-text,var(--dsw-alias-brand-primary,var(--lw-brand)))}',
      '.lw-pull-track{position:relative;display:block;width:52px;height:22px;box-sizing:border-box;border-radius:999px;',
      'border:1px solid var(--dsw-alias-border-l2,rgba(15,23,42,.16));',
      'background:linear-gradient(180deg,color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fff) 92%,transparent),color-mix(in srgb,var(--dsw-alias-label-primary,#0f172a) 5%,transparent)),var(--dsw-alias-bg-layer-2,#eef2f7);',
      'box-shadow:inset 0 1px 2px rgba(15,23,42,.12);',
      'transition:background-color 420ms cubic-bezier(.32,.72,0,1),border-color 420ms cubic-bezier(.32,.72,0,1),box-shadow 420ms cubic-bezier(.32,.72,0,1)}',
      '.lw-pull:hover .lw-pull-track{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#2563eb) 40%,transparent)}',
      '.lw-pull.lw-pull-armed .lw-pull-track{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#2563eb) 55%,transparent);',
      'background:color-mix(in srgb,var(--dsw-alias-brand-primary,#2563eb) 18%,var(--dsw-alias-bg-layer-1,#fff));',
      'box-shadow:inset 0 1px 2px rgba(15,23,42,.1),0 0 10px color-mix(in srgb,var(--dsw-alias-brand-primary,#2563eb) 30%,transparent)}',
      '.lw-pull-knob{position:absolute;top:2px;left:2px;display:block;width:16px;height:16px;border-radius:50%;',
      'background:radial-gradient(circle at 32% 28%,#fff 0%,#fff 42%,color-mix(in srgb,var(--dsw-alias-label-primary,#0f172a) 10%,#fff) 100%);',
      'box-shadow:0 1px 3px rgba(15,23,42,.28),0 0 0 1px rgba(15,23,42,.08);',
      'transform:translateX(0);',
      'transition:transform 420ms cubic-bezier(.34,1.56,.64,1),box-shadow 420ms cubic-bezier(.32,.72,0,1)}',
      '.lw-pull.lw-pull-armed .lw-pull-knob{transform:translateX(30px);',
      'background:radial-gradient(circle at 32% 28%,#fff 0%,color-mix(in srgb,var(--dsw-alias-brand-primary,#2563eb) 20%,#fff) 100%);',
      'box-shadow:0 1px 4px rgba(15,23,42,.3),0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary,#2563eb) 30%,transparent),0 0 8px color-mix(in srgb,var(--dsw-alias-brand-primary,#2563eb) 34%,transparent)}',
      // armed 退场编排：滑块落位 → 头部其余元素与主内容下沉缩小淡出 → close
      '.lw-center-closing>.lw-head>:not(.lw-pull){opacity:.45;transition:opacity 320ms cubic-bezier(.32,.72,0,1)}',
      '.lw-center-closing>:not(.lw-head){opacity:0;transform:translateY(10px) scale(.988);',
      'transition:opacity 320ms cubic-bezier(.32,.72,0,1),transform 320ms cubic-bezier(.32,.72,0,1)}',
      '@media (prefers-reduced-motion:reduce){',
      '.lw-pull-label,.lw-pull-track,.lw-pull-knob,',
      '.lw-center-closing>.lw-head>:not(.lw-pull),',
      '.lw-center-closing>:not(.lw-head){transition:none}}',
      // ── 分拣 ──
      // 用卡片而不是表格：这一页的决策输入是**正文**（"这页我还要不要"），
      // 而正文塞不进表格列。表头在这里只会挤掉真正要看的东西。
      '.lw-tri{display:flex;flex-direction:column;gap:8px}',
      '.lw-tri-card{border:1px solid var(--lw-line);border-radius:10px;padding:10px 12px;background:var(--lw-raise)}',
      '.lw-tri-head{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}',
      '.lw-tri-title{flex:1;min-width:0;font-weight:600;color:var(--lw-fg);word-break:break-word}',
      '.lw-tri-meta{flex:none;font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);color:var(--lw-fg4);font-variant-numeric:tabular-nums}',
      // 两个来源的标签**配色要分得开**：已拒绝是"这条知识被判错"，回收站是
      // "这条暂存页不想要了" —— 语义不同，长得一样就得每次去读文字。
      '.lw-tri-tag{flex:none;padding:1px 7px;border-radius:6px;background:var(--lw-line-soft);',
      'font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);color:var(--lw-fg3);white-space:nowrap}',
      '.lw-tri-tag.rej{background:color-mix(in srgb,var(--lw-warn) 18%,transparent);color:var(--lw-warn)}',
      // 原因块：它是**决策输入**，所以不做成小字备注，而是卡片里第二显眼的东西。
      '.lw-tri-why{margin:8px 0 0;padding:7px 9px;border-radius:8px;border-left:3px solid var(--lw-warn);',
      'background:var(--lw-line-soft);color:var(--lw-fg2);word-break:break-word}',
      '.lw-tri-why .k{display:block;margin-bottom:3px;color:var(--lw-warn);',
      'font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);letter-spacing:.02em}',
      // 没记录原因时必须**看得出来是"没记录"**，而不是让人以为这页本来就没理由。
      '.lw-tri-why.none{border-left-color:var(--lw-line);color:var(--lw-fg4)}',
      '.lw-tri-why.none .k{color:var(--lw-fg4)}',
      '.lw-tri-exc{margin:6px 0 0;color:var(--lw-fg2);white-space:pre-wrap;word-break:break-word;',
      'max-height:9em;overflow:hidden}',
      '.lw-tri-full{margin:6px 0 0;color:var(--lw-fg2);white-space:pre-wrap;word-break:break-word}',
      '.lw-tri-acts{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:8px}',
      '.lw-tri-acts .lw-tri-ask{color:var(--lw-warn)}',
      '.lw-tri-more{flex:none;padding:0;border:0;background:none;color:var(--lw-fg3);cursor:pointer;font:inherit;',
      'text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px}',
      '.lw-hint{font:var(--dsw-font-xxs-12,12px/18px \'Noto Sans SC\',sans-serif);line-height:1.6;color:var(--lw-fg3);padding:0 2px 10px}',
      // ── 模型页签 + 提炼按键 ──
      //
      // 复用既有的 .lw-sec/.lw-table/.lw-msg，只加缺的那几个。新控件全部走
      // 已有的 --lw-* 与 --dsw-font-* 两级 token，不自己发明颜色和字号。
      '.lw-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0}',
      '.lw-grow{flex:1 1 260px;min-width:0}',
      '.lw-savebar{margin-top:14px;padding-top:12px;border-top:1px solid var(--lw-line-soft)}',
      // 候选列表：用序号而不是圆点，因为**顺序就是语义**（轮换按它循环，
      // 单一模式用第一个）。序号让"谁是第一个"不用读文字就能看出来。
      '.lw-mlist{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:4px}',
      '.lw-mitem{display:flex;align-items:center;gap:8px;padding:5px 8px;border:1px solid var(--lw-line-soft);border-radius:8px;background:var(--lw-raise)}',
      '.lw-midx{flex:none;width:18px;text-align:right;font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);color:var(--lw-fg4);font-variant-numeric:tabular-nums}',
      '.lw-mname{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:var(--dsw-font-xs-13,13px/20px \'Noto Sans SC\',sans-serif);color:var(--lw-fg)}',
      '.lw-mtag{flex:none;padding:1px 7px;border-radius:6px;background:var(--lw-line-soft);font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);color:var(--lw-fg3);white-space:nowrap}',
      '.lw-mact{flex:none;display:flex;gap:2px}',
      '.lw-mini{padding:1px 7px;border:1px solid var(--lw-line-soft);border-radius:6px;background:transparent;color:var(--lw-fg3);cursor:pointer;font:inherit;line-height:1.5}',
      '.lw-mini:hover:enabled{color:var(--lw-fg);border-color:var(--lw-line)}',
      '.lw-mini:disabled{opacity:.35;cursor:default}',
      '.lw-copy{margin-left:auto}',
      '.lw-sel{max-width:220px;padding:3px 6px;border:1px solid var(--lw-line-soft);border-radius:6px;',
      'background:var(--lw-surface);color:var(--lw-fg);font:var(--dsw-font-xxs-12,12px/18px \'Noto Sans SC\',sans-serif)}',
      '.lw-mledit{margin-top:2px}',
      '.lw-ml-t{flex:none;width:44px;color:var(--lw-fg3);font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif)}',
      '.lw-ml-note{color:var(--lw-fg4);font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);line-height:1.6}',
      // ── wiki_recall 的对话内卡片 ──
      // 刻意**不自带背景**：它嵌在宿主既有的工具行里，自己再铺一层底色
      // 会和宿主那一行的底打架（表现为一块突兀的色带）。只做排版与状态色。
      '.lw-recall{display:flex;flex-direction:column;gap:6px;padding:2px 0;min-width:0}',
      '.lw-recall-head{display:flex;align-items:center;gap:8px;min-width:0}',
      '.lw-recall-verdict{flex:none;font:var(--dsw-font-xxxs-strong-11,600 11px/16px \'Noto Sans SC\',sans-serif)}',
      '.lw-recall-query{color:var(--lw-fg2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1}',
      '.lw-recall-best{flex:none;font-variant-numeric:tabular-nums}',
      '.lw-recall-sum{font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);font-variant-numeric:tabular-nums}',
      '.lw-recall-list{display:flex;flex-direction:column;gap:2px;border-top:1px solid var(--lw-line-soft);padding-top:4px}',
      '.lw-recall-row{display:flex;flex-direction:column;gap:2px;padding:3px 0;min-width:0}',
      '.lw-recall-rowhead{display:flex;align-items:center;gap:7px;min-width:0}',
      '.lw-recall-dot{flex:none;font-size:var(--dsw-font-xxxs-11,11px)}',
      '.lw-recall-title{color:var(--lw-fg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}',
      '.lw-recall-facts{display:flex;align-items:center;gap:5px;flex:none}',
      '.lw-recall-chip{font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);color:var(--lw-fg3);',
      'font-variant-numeric:tabular-nums;padding:0 5px;border:1px solid var(--lw-line-soft);border-radius:99px}',
      '.lw-recall-toggle{margin-left:auto;flex:none;cursor:pointer;background:none;border:0;padding:0 2px;',
      'color:var(--lw-fg3);font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif)}',
      '.lw-recall-toggle:hover{color:var(--lw-fg)}',
      '.lw-recall-detail{display:flex;flex-direction:column;gap:2px;padding:2px 0 4px 16px;',
      'font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);color:var(--lw-fg3);line-height:1.6}',
      '.lw-recall-note{font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);line-height:1.6}',
      // ── 图谱页签 ──
      // 边框色/透明度按权重分档在 JS 里算（边数多，不能每条一个 class）。
      '.lw-graph{display:flex;gap:12px;min-height:0;flex:1}',
      '.lw-graph-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}',
      '.lw-graph-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.lw-graph-legend{display:flex;align-items:center;gap:10px;font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);color:var(--lw-fg3);margin-left:auto}',
      '.lw-graph-leg{display:flex;align-items:center;gap:4px;white-space:nowrap}',
      '.lw-graph-swatch{width:9px;height:9px;border-radius:50%;flex:none}',
      '.lw-graph-svgbox{flex:1;min-height:340px;border:1px solid var(--lw-line-soft);border-radius:10px;overflow:hidden;',
      'background:#fafafa;border-color:#d5d9de;position:relative}',
      '.lw-graph-svg{display:block;width:100%;height:100%}',
      // d3 交互图：容器填满画布；标签白描边光晕（Neo4j 式可读性）。
      '.lw-d3{width:100%;height:100%}',
      '.lw-d3 svg{display:block}',
      '.lw-d3 text{font:10px \'Noto Sans SC\',sans-serif;paint-order:stroke;',
      'stroke:#fff;stroke-width:3px;stroke-linejoin:round;pointer-events:none}',
      // 文本节点标签用 SVG text，字体走 token；fill 在 JS 里按状态给。
      '.lw-graph-svg text{font:var(--dsw-font-xxxs-11,10px/14px \'Noto Sans SC\',sans-serif);pointer-events:none}',
      '.lw-graph-svg .lw-gnode{cursor:pointer}',
      '.lw-graph-svg .lw-gnode:focus-visible{outline:none}',
      '.lw-graph-svg .lw-gnode:focus-visible circle{stroke:var(--lw-brand);stroke-width:2.5}',
      // 侧抽屉：与图并排，不遮图（遮住的抽屉会让你点不了背后的节点）。
      '.lw-graph-drawer{flex:none;width:320px;max-width:38%;display:flex;flex-direction:column;gap:8px;',
      'border:1px solid var(--lw-line-soft);border-radius:10px;padding:10px 12px;overflow:auto;background:var(--lw-surface)}',
      '.lw-graph-drawer h4{margin:0;font:var(--dsw-font-s-strong-14,600 14px/22px \'Noto Sans SC\',sans-serif)}',
      '.lw-graph-drawer .lw-graph-meta{font:var(--dsw-font-xxxs-11,11px/16px \'Noto Sans SC\',sans-serif);color:var(--lw-fg3);display:flex;flex-wrap:wrap;gap:4px 10px}',
      '.lw-graph-empty{padding:40px 0;text-align:center;color:var(--lw-fg3)}',
      // ★ 这下面不许有"无选择器的声明碎片"：两条孤儿片段曾把 CSS 解析器的
      //   错误恢复吞到下一条规则 —— .lw-center-full 整条丢失（display:flex /
      //   overflow:auto 全没生效），全屏接管页因此整页无界撑高、表格底部被
      //   窗口裁掉。加一条规则必须带完整选择器，出了界面前先跑
      //   scripts/verify-theme-root.mjs 的 CSSOM 断言。
      // ── 主面板接管（对齐 aida-welink：原位铺满 centerCol，不碰侧栏）──────
      // 以前是 position:fixed inset:0 —— 会把侧栏一起盖掉。现在宿主 main
      // 面板渲染在哪就铺满哪：flex:1 与 height:100% 双保险，侧栏保持可用。
      // 铺满 session+canvas 区域靠下面的 :has 网格中和规则（同 welink）。
      '.lw-center-full{position:relative;z-index:1;flex:1 1 auto;align-self:stretch;',
      'width:100%;height:100%;min-height:0;min-width:0;display:flex;flex-direction:column;',
      'box-sizing:border-box;background:var(--lw-surface);overflow:auto}',
      // aida-ui 画布共存：接管期间画布列收为 0，session 列拿满（侧栏 280/56px 不动）
      '[data-aida-canvas-balanced]:has(#aico-wiki-center),',
      '[data-aida-canvas-maximized]:has(#aico-wiki-center){',
      'grid-template-columns:280px minmax(0,1fr) 0px !important}',
      '[data-aida-canvas-balanced][data-sidebar-collapsed]:has(#aico-wiki-center),',
      '[data-aida-canvas-maximized][data-sidebar-collapsed]:has(#aico-wiki-center){',
      'grid-template-columns:56px minmax(0,1fr) 0px !important}',
      '[class*="frame"]:has(#aico-wiki-center) [class*="rightbarCol"],',
      '[class*="frame"]:has(#aico-wiki-center) [data-rightbar-col],',
      '[class*="frame"]:has(#aico-wiki-center) [data-side="rightbar"]{display:none !important}',
      // ── 插件页卡片（plugins.item / plugins.detail.section）──
      '.lw-plug-card{display:flex;align-items:center;gap:12px;padding:14px 16px;',
      'border:1px solid var(--lw-line);border-radius:12px;background:var(--lw-raise)}',
      '.lw-plug-card--stack{flex-direction:column;align-items:stretch;gap:12px}',
      '.lw-plug-title{font:var(--dsw-font-s-strong-14,600 14px/22px \'Noto Sans SC\',sans-serif)}',
      '.lw-plug-note{margin:2px 0 0;font:var(--dsw-font-xxs-12,12px/18px \'Noto Sans SC\',sans-serif);color:var(--lw-fg2)}',
    ].join('')

    var styled = false
    function ensureStyle() {
      if (styled || typeof document === 'undefined') return
      var el = document.createElement('style')
      el.setAttribute('data-aico-llm-wiki', '1')
      el.textContent = CSS
      document.head.appendChild(el)
      styled = true
    }

    /**
     * 读响应，但**不盲调 r.json()**。
     *
     * 为什么：实测踩过一次。路由注册成 kind:'exact' 之后，/api/page 根本到不了
     * handler，前端收到的是宿主的 404 HTML，.json() 抛出
     * 「Unexpected token '<' ... is not valid JSON」——这句话把真正的原因
     * （404 + HTML）完全盖住，我照着它查了半天前端代码。
     * 现在先把状态码和 content-type 摆出来，解析失败反而是最后才提的事。
     */
// ── 模块：api（取数封装部分）────────────────────────────────────
// （分区头与端点常量见 00-boot.js。）
    function readJson(r) {
      var ct = (r.headers && r.headers.get && r.headers.get('content-type')) || ''
      return r.text().then(function (raw) {
        if (ct.indexOf('application/json') >= 0) {
          try { return { status: r.status, j: JSON.parse(raw), error: null } }
          catch (e) { return { status: r.status, j: null, error: 'JSON 解析失败：' + String((e && e.message) || e) } }
        }
        return {
          status: r.status,
          j: null,
          error: 'HTTP ' + r.status + '，返回的不是 JSON（content-type=' + (ct || '空') + '）：'
            + String(raw).replace(/\s+/g, ' ').slice(0, 160),
        }
      })
    }
    function fail(e) { return { status: 0, j: null, error: '请求失败：' + String((e && e.message) || e) } }

    function getJson(url) {
      return fetch(url, { headers: { accept: 'application/json' } }).then(readJson).catch(fail)
    }
    function post(path, body) {
      return fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body || {}),
      }).then(readJson).catch(fail)
    }