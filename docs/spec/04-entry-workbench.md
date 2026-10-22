# Spec 04 · 工作台入口（对齐 aida-lld 形式）

Date: 2026-10-22
Status: **Accepted / Implemented**（v0.5.0）
Input: 用户指示「入口参考 aida-lld：通过 aico-wiki 进入工作台；安装后应有二级页面查看信息」。
（同轮曾要求 MCP 知识库支持，用户随后撤销，未实现。）

## 决定

入口从「侧栏底栏图标 → 模态面板」升级为 aida-lld 同款的三入口 + 主面板接管：

| 入口 | 实现 | 说明 |
|------|------|------|
| ① composer 命令 | `commandUi.register` popupSelect，命令名 `aico-wiki` | 选项=页签（能力/知识/图谱/分拣/补料/模型），选中直达对应页签，全程不经模型 |
| ② 插件页卡片 | `plugins.item`（summary 一行 / page 二级页面大卡片） | 「插件」页官方组之后的独立卡片，点开进入本插件二级页面 |
| ③ 插件详情区块 | `plugins.detail.section` | 本插件 bundle 详情页正文区的大号打开按钮 |
| 后备 | 原侧栏 `sidebar.footer.action` 模态入口保留 | commandUi/layout 不可用时的兜底 |

主面板：keyed `main` 插槽（key=`aico-wiki`）+ `layout.selectPanel` 接管中央区（保留侧栏）。

## 关键实现决定

- **main 面板注册一次、常驻**：开/关只切 `selectPanel`，绝不注销——同 key 重复注册在
  dispose 后不被宿主重新接纳（aida-lld 踩过「首次可开、关掉再开无效」）。
- **面板内容复用 PanelBody**（key=entryTab 强制重挂载换页签）：模态/主面板两套外壳
  共享同一套页签与数据逻辑，不复制代码。
- **package.json `dsh.client.inject`** 声明 slots/layout/commands/plugin-manager 四个
  客户端模块（对齐 aida-lld；此前为空数组）。
- **所有注册点都 try/catch 包裹**：座位/服务拿不到只丢对应入口，不拖垮插件。
- **active 订阅**：插件卡通过 `isActive/subscribeActive` 注入面跟随面板开关状态刷新。

## 验收

- 离线渲染烟测：AicoWikiCenter（头部+关闭+指定页签）、AicoPluginItem（own 出卡片 /
  他包返回 null / summary 一行）、AicoPluginSection 全部通过。
- 回归：verify:graph 27/27、verify:render ALL PASS（含更名遗漏的 aria-label 断言修正）、
  verify:plugin ALL PASS。

## 已知边界

- 重启宿主后生效（client 模块随 profile 加载）。
- `subject.pkg.name` 判据绑定包名 `aico-local-wiki`——再改名要同步这里。
