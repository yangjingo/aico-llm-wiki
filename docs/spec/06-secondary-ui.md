# Spec 06 · 二级界面重绘（华为红体系 · 目录导航骨架）

Date: 2026-10-22
Status: **Accepted / Implemented**（v0.5.0；同日修订见文末）
Input: 用户指示「基于 spec 的 design 配色，重置绘制插件的二级界面」。
三版设计稿（A 胶片式 / B 目录导航 / C 页签精稿）供选后，按 spec 05 配色落地
**B+A 混合骨架**（B 的目录导航 + A 的观点句标题与 KPI 数字带）。

> **修订 1（2026-10-22，用户反馈）**：① 用户确认喜欢 B 方式；② **首页改为知识图谱**
> ——TABS/导航以 graph 打头（KNOWLEDGE: 图谱/知识/分拣；OPERATION: 补料/能力/模型，
> 取消 OVERVIEW 组），PanelBody 与 AicoWikiCenter 默认页签、命令默认 entryTab 均为 graph；
> ③ **KPI 状态带复用原 repo 的状态设计**——直接采用 CLS 表（label + StateDot state +
> c-类），条目=已固化/待固化/已确认/未确认（并入新页，KFILTERS 语义）/有反证
> （疑似有害+观察中合并，error 点）/死知识；一个状态在任何视图里长得一样。
>
> **修订 2（2026-10-25，用户反馈）**：① 首页图谱升级为 **Neo4j Browser 风格交互图**
> ——三方包 d3 v7（UMMD 280KB vendor 进 client/vendor/，经宿主静态路由
> /aico-local-wiki/vendor/* 注入，零构建约束不变）：forceSimulation + 缩放平移 +
> 节点拖拽 + 悬停/选中邻居高亮（灰化其它）；d3 拥有 svg 子树，选中态回写 React
> state 复用抽屉/固化/跳转；加载失败或离线渲染自动回落静态 SVG。
> ② **知识库目录树**：/api/tree 返回 pages/·staged/ 目录结构，知识页签左侧
> 文件浏览器式目录树（分类色点 + 折叠 + 计数），点击=打开该页详情，
> 「图」按钮=跳图谱定位（PanelBody focusNode 载荷，与图谱→知识跳转对称）。
> ③ **溯源（provenance）**：/api/state 的 committed/staged 带回 srcs 数组
> （前 8 条）；sourceKind() 把来源归为三形状——session://（会话锚点，harvest
> 永远附）/ URL（链接）/ 其余（文档路径）；知识表格新增「来源」列（chips 短显
> + title 全量 + URL 可点开），PageDetail 来源列表带类型徽标（红/灰蓝/蓝）。

## 骨架（替换原横向页签条）

```
┌ head：aico-wiki + wikiRoot 路径 ─────────────────────────┐
│ ┌ nav（目录）──────┐ ┌ main ────────────────────────────┐ │
│ │ OVERVIEW         │ │ 面包屑：KNOWLEDGE / 知识           │ │
│ │ 01 能力          │ │ h3 观点句：已沉淀 2 条知识…（数字红）│ │
│ │ KNOWLEDGE        │ │ KPI 数字带：红大数字+黑小单位 ×6     │ │
│ │ 02 知识  [徽标]  │ │ ── 页签体（知识/图谱/…，未动）──    │ │
│ │ 03 图谱          │ │                                   │ │
│ │ 04 分拣          │ │                                   │ │
│ │ OPERATION        │ │                                   │ │
│ │ 05 补料 / 06 模型│ │                                   │ │
│ └──────────────────┘ └───────────────────────────────────┘ │
```

## 要点（对应 design-system / huawei-style 条目）

| 条目 | 实现 |
|---|---|
| 目录页式导航 | 左侧固定目录：mono 编号（01–06）+ 分组（OVERVIEW/KNOWLEDGE/OPERATION），当前项**红高亮 + 左红条 + #fdf0f1 底** |
| 徽标 = 待办计数 | 「有待办」的页才带徽标（知识=暂存数、分拣=回收+拒绝、补料=缺口数）——数字说有事，导航带计数 |
| 标题 = 观点句 | `titleParts(tab, state)` 按页动态生成判断句，**数字红黑混排**（「已沉淀 `2` 条知识」）；未知页签中性兜底，不给可能出错的数字 |
| KPI 数字带 | `kpiItems(state)` 六联：已固化/待固化（红）、累计命中/已确认（蓝 #1565c0 点睛）、检索缺口/嫌疑（灰蓝 #566472）——mono 大数字 + 中文小单位 |
| 面包屑 | `分组 / 当前页`，当前页红字（长导航定位三件套之一） |
| 键盘可达 | nav item 为真 button + role=tab + aria-selected，沿用 tabKeys 方向键 |
| 窄面板适配 | <760px 目录塌成横条、红高亮移到底边（模态/分屏场景） |

## 复用与未动

- 六个页签体（能力/知识/图谱/分拣/补料/模型）内部**一行未改**——只换了外壳；
  图谱/知识抽屉/固化交互全部原样。
- `tabsSummary` 保留（供旧断言/诊断），新壳不再用它；`TABS` 仍是导航与
  `aico-wiki` 命令选项的唯一真源。
- 纯函数 `titleParts / kpiItems / navBadge / NAVGROUPS` 已入 `__logic` 导出，可离线穷举。

## 验收

- verify:render ALL PASS、verify:graph 27/27、新壳渲染烟测（nav/crumb/h3/kpi 全在）。
- 证据：docs/evidence/workbench-v2-knowledge.png（离线渲染，makeState 夹具）。
