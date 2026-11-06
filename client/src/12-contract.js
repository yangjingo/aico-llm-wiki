// ═══ 12-contract.js · 插件契约：slots 注入与导出（本文件的收口） ═══
// （源码文件，编辑后运行 pnpm run build:client 合成 client/client.js）
// ── 模块：contract ─────────────────────────────────────────────────
// 插件契约收口：name/inject/apply 与 exports（__components/__logic/__css）。

    // ── 插件契约 ──
    var name = 'aico-llm-wiki'
    var inject = ['slots', 'locale', 'theme', 'layout']

    var ZH = { title: 'aico-wiki', capabilities: '能力', knowledge: '知识', supply: '补料' }
    var EN = { title: 'aico-wiki', capabilities: 'Capabilities', knowledge: 'Knowledge', supply: 'Supply' }

    function apply(ctx) {
      try {
        ctx.effect(function () { return ctx.locale.register(name, { zh: ZH, en: EN }) }, 'aico-llm-wiki: dictionaries')
      } catch (e) { /* 字典注册失败不该挡住 UI */ }
      // ── 对话内的 wiki_recall 卡片 ──
      //
      // 座位规则同下：注册到**未声明**的插槽会抛，所以必须用 inject 包住。
      // 拿不到座位不影响面板 —— 卡片是附加品，不该有能力拖垮插件。
      try {
        ctx.slots.inject('tool.call.toolview', function () {
          return ctx.slots.register({
            name: 'tool.call.toolview',
            key: 'wiki_recall',
            locale: name,
          }, RecallCard)
        })
      } catch (e) {
        try { console.error('[aico-llm-wiki] wiki_recall 卡片座位不可用：', e) } catch (err) {}
      }
      // 侧边栏入口（sidebar.footer.action）已按需求移除：
      // 打开工作台的入口收敛为 /aico-wiki 命令 + 插件页卡片。
      // FooterEntry 组件保留（verify 脚本与后备模态还在引用），只是不再注册座位。
      // 输入框上方的待办提示条。座位给的就是"独占一整行"，正是这条子要的。
      //
      // 座位规则（来自 DSH 的 slot-catalog）：注册到**未声明**的插槽会抛异常，
      // 所以必须用 ctx.slots.inject 包住 —— 它在声明出现（或重新挂载）时才执行注册。
      // 另外**不要**传 priority：框架会给一个低于所有内置项的值，单格里就是自己渲染。
      try {
        ctx.slots.inject('conversation.input.dock', function () {
          return ctx.slots.register({
            name: 'conversation.input.dock',
            id: 'aico-llm-wiki-pending',
            order: 40,
            locale: name,
            // 座位契约：inject 收到当前 sessionId，欢迎页（hero）没有会话时是
            // undefined。待办条是"该回工作台拍板了"的提醒，欢迎页连工作台都
            // 还没进，提醒只会挡在输入框上方——注入 inSession 供组件判定。
            inject: function (sessionId) { return { inSession: sessionId != null } },
          }, PendingBar)
        })
      } catch (e) {
        // 座位拿不到就不显示提示条，但**面板照旧可用**（侧边栏入口还在）。
        // 一个附加的提示不该有能力拖垮整个插件。
        try { console.error('[aico-llm-wiki] 待办提示条座位不可用：', e) } catch (err) {}
      }

      // ── 主面板接管（keyed main，对齐 aida-lld 的 0.2.0 形式）──
      //
      // 注册一次、常驻：开/关只切 layout.selectPanel，绝不注销——
      // 同 key 重复注册在 dispose 后不被宿主重新接纳（「首次可开、关掉再开无效」）。
      var AICO_MAIN_PANEL = 'aico-wiki'
      var AICO_COMMAND = 'aico-wiki'
      var layout = null
      try { layout = ctx.get('layout') } catch (e) { /* 宿主没给 layout 服务 */ }

      var panelActive = false
      var panelListeners = []
      var entryTab = 'graph'   // 命令选中的页签；激活前设置、面板初始化时读取（首页=图谱）
      var panelNotify = function () { for (var i = 0; i < panelListeners.length; i++) { try { panelListeners[i]() } catch (e) {} } }
      var actionInjected = {
        isActive: function () { return panelActive },
        subscribeActive: function (cb) {
          panelListeners.push(cb)
          return function () {
            var idx = panelListeners.indexOf(cb)
            if (idx >= 0) panelListeners.splice(idx, 1)
          }
        },
        open: function () { panelActivate() },
        close: function () { panelDeactivate() },
      }
      var panelActivate = function () {
        if (panelActive) return
        panelActive = true
        try { layout && layout.closeRightbar && layout.closeRightbar() } catch (e) {}
        try { layout && layout.selectPanel && layout.selectPanel(AICO_MAIN_PANEL) } catch (e) {}
        panelNotify()
      }
      var panelDeactivate = function () {
        if (!panelActive) return
        panelActive = false
        try { layout && layout.selectPanel && layout.selectPanel(null) } catch (e) {}
        panelNotify()
      }
      /** 命令/入口选中某页签：已激活则靠 key 重挂载换页签，未激活则打开。 */
      var openEntry = function (tab) {
        entryTab = tab || 'knowledge'
        panelActivate()
      }

      try {
        ctx.slots.register({
          name: 'main',
          key: AICO_MAIN_PANEL,
          inject: function () {
            return { close: panelDeactivate, entryTab: function () { return entryTab } }
          },
        }, AicoWikiCenter)
      } catch (e) {
        try { console.error('[aico-llm-wiki] main 面板注册失败：', e) } catch (err) {}
      }

      // 插件页入口 1：官方组之后的独立卡片（点卡片进入本插件的二级页面）。
      try {
        ctx.slots.inject('plugins.item', function () {
          return ctx.slots.register({
            name: 'plugins.item',
            id: 'aico-wiki',
            order: 102,
            label: 'aico-wiki',
            inject: function () { return actionInjected },
          }, AicoPluginItem)
        })
      } catch (e) {
        try { console.error('[aico-llm-wiki] plugins.item 座位不可用：', e) } catch (err) {}
      }

      // 插件页入口 2：本插件详情页正文区块（大号打开按钮）。
      try {
        ctx.slots.inject('plugins.detail.section', function () {
          return ctx.slots.register({
            name: 'plugins.detail.section',
            id: 'aico-wiki',
            order: 100,
            label: 'aico-wiki',
            inject: function () { return actionInjected },
          }, AicoPluginSection)
        })
      } catch (e) {
        try { console.error('[aico-llm-wiki] plugins.detail.section 座位不可用：', e) } catch (err) {}
      }

      // 入口 3：composer 命令 aico-wiki（popupSelect 选页签直达，全程不经模型）。
      // commandUi 可能没被宿主提供，ctx.inject 拿不到就静默跳过——
      // 插件页入口还在，命令只是加速器。
      try {
        ctx.inject(['commandUi'], function (scope) {
          var command = scope.get('commandUi')
          if (!command || typeof command.register !== 'function') return
          scope.effect(function () {
            return command.register({
              name: AICO_COMMAND,
              label: function () { return 'aico-wiki · 本地知识库工作台' },
              description: function () { return 'aico-wiki —— 选择页签并直接展开（知识 / 图谱…）' },
              icon: WikiIcon,
              available: function () { return true },
              ui: {
                kind: 'popupSelect',
                options: async function () {
                  return TABS.map(function (t) { return { id: t.id, label: t.label } })
                },
                onSelect: async function (option) { openEntry(option && option.id) },
              },
            })
          }, 'aico-llm-wiki: aico-wiki command')
        })
      } catch (e) {
        try { console.error('[aico-llm-wiki] 命令注册不可用：', e) } catch (err) {}
      }
    }

    exports.name = name
    exports.inject = inject
    exports.apply = apply

    /**
     * 结构测试的接缝。
     *
     * 这些组件都是 factory 闭包里的私有函数，外部够不着——所以"把组件树渲染成
     * HTML，看看会不会炸"这件事，在补上这个导出之前根本做不到，只能靠肉眼看
     * 界面。而肉眼刚放过一次 bug（三元少写 ': null'，整棵树当场渲染失败）。
     *
     * 导出它们**不改变运行时契约**：DSH 只读 name / inject / apply，
     * 多一个字段对宿主是惰性的。
     */
    exports.__components = {
      PanelBody, Workbench, FooterEntry, PendingBar, TriageTab,
      CapabilitiesTab, ToolsSection, SkillsSection,
      KnowledgeTab, SupplyTab, PageDetail,
      ModelsTab, ModelListEditor, HarvestSection,
      RecallCard, GraphTab,
      AicoWikiCenter, AicoPluginItem, AicoPluginSection,
      D3Graph, KbTree, KbTreeNode,
    }

    /**
     * 纯逻辑也一并交出去：排序、分组、筛选不经过 React 就能被穷举断言。
     * 渲染测试只负责证明"这些结果能画出来且不崩"，两件事分开测。
     */
    exports.__logic = {
      toolGroups, toolRowsVisible, familyOpen, knowledgeView, KFILTERS, tabKeys, pendingTotal, TABS,
      // 卡片的**判据**单独交出：给一段真实的工具结果，卡片该说什么 —— 这是可以
      // 逐条钉死的纯函数，而"卡片好不好看"不该混进测试里。
      recallCardModel, recallCallOf, recallResultText,
      // 图谱的视觉判据也交出去：半径/标签取舍/边的档位都能离线穷举。
      graphNodeRadius, graphLabelWorthy, graphLabelCut, graphEdgeStyle,
      // 二级界面（spec 05 重绘）的判据：观点句分段 / KPI 条目 / 导航徽标。
      titleParts, kpiItems, navBadge, NAVGROUPS,
      // 溯源判据（spec 06 修订）：来源三形状归类。
      sourceKind,
      // 证据跳转：页码锚解析是纯函数，openDocSource 交给在线冒烟。
      openDocSource,
      // 换肤与换库：THEMES 的每个 id 必须有对应 CSS 变量组（离线断言）。
      THEMES, loadTheme, saveTheme,
    }

    /**
     * 样式表原文。
     *
     * 给截图工具用：它把组件渲染成静态 HTML 之后，得把这份 CSS 一起贴进去
     * 才能看见真实的排版。没有它，截出来的图就是一堆无样式的裸标签——
     * 那种图会让人误判"界面坏了"，比不截图更糟。
     */
    exports.__css = CSS

    return module.exports
  },
})
