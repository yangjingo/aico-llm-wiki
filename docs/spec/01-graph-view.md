# Spec 01 · 知识图谱页签（feature: graph-view）

Date: 2026-10-22
Status: **Accepted / Implemented**（feat/graph-view `ad55333`，v0.4.0）
Input: 用户需求「插件联动右侧工作台可视化显示 wiki 的图，能够左右交互」

## 需求

1. 插件需在 DSH 工作台（侧栏面板）中可视化 wiki 知识结构。
2. 图与知识库双向交互（不止看，还要能操作）。

## 现状调研（决策依据）

上游 dsh-learn-wiki v0.3.1 的客户端只有表格面板（能力/知识/分拣/补料/模型），
整个 client.js 无任何 SVG/canvas/graph 代码；已有交互为勾选裁剪工具、固化暂存页。

## 方案（用户在 4 个选项中选定「完整方案①~④」）

| # | 改动 | 位置 | 内容 |
|---|------|------|------|
| ① | 数据 | `lib/graph.js` + `/api/graph` | 节点=页面；边=共享标签(tag) + 同一次召回共命中(co) |
| ② | 展示 | client 新增「图谱」页签 | SVG 力导向；颜色=分类，大小=命中，虚线圈=暂存 |
| ③ | 交互 | client | 单击节点→抽屉正文；双击/按钮→知识页签跳转展开；图上固化（复用 /api/commit） |
| ④ | 自检 | `scripts/verify-graph.mjs` | 建图/布局/视觉判据/真 React 渲染，27 条断言 |

## 关键设计决定

- **布局在服务端算**（graphLayout 确定性纯函数，无随机数）：客户端零力导向代码，
  离线渲染/截图与浏览器画出的图一致。
- **边只用可解释信号**：tag（共享标签）、co（共召回，记进 `usage.json` 的 `co` 账本，
  由 `recordHit` 顺手两两累计）。不做语义 embedding 边——结构图回答「哪些知识成群」，
  不抢检索的活。
- **图谱独立端点**，不进 8 秒轮询（建图遍历全库）。
- **co 边在 tag 边之上**（更粗、实线）：「总一起被需要」是更强的结构性信号。

## 验收

`pnpm run verify:graph` 27 条断言全过（映射见 docs/test-cases.md）；
回归 verify:render / verify:plugin 全过。
