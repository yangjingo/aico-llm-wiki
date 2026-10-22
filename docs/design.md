# Design

> fork 自 [Dayi-Z/dsh-learn-wiki](https://github.com/Dayi-Z/dsh-learn-wiki) v0.3.1（`1d20bd5`），
> 收编为 aiCo 的本地 wiki 插件，更名 `aico-local-wiki`。本文档记录 aiCo 增量改动的设计；
> 上游架构（CRAG 纠错回路、两段式 commit、挣扎触发补料）见仓库 README。

## Goals（aiCo 增量）

1. 让知识库的结构**可见**：哪些知识成群、哪些总是一起被需要、哪些孤立无人引用。
2. 双向交互：图不只是看，能就地读正文、固化暂存页、跳转到知识页签。
3. 保持上游的工程铁律：零构建客户端、确定性可断言、自动路径不阻塞。

## Architecture

```text
pages/ + usage.json (usage.co)
    │ lib/graph.js buildGraph（纯函数：tag 边 + co 边，稳定排序，maxEdges 截断）
    ▼
GET /aico-local-wiki/api/graph
    │ graphLayout（服务端确定性力导向：圆形初始化 + 固定 200 迭代，无随机数）
    ▼
节点带 (x,y) 坐标下发
    │ client GraphTab（纯渲染：SVG circle/line，零力导向代码）
    ▼
点选 → 淡出无关 / 侧抽屉正文（/api/page）/ 固化（/api/commit）/ focusId 跳知识页签
```

## Decisions

| 决定 | 理由 |
|------|------|
| 布局在服务端算 | 同一份数据在任何端画出的图一致；离线渲染（verify/snapshot）与浏览器同源 |
| 边只用 tag / co 两种可解释信号 | 这张图回答「结构」，语义相似是检索的事，不混进来 |
| co 记账放进 recordHit | 一次召回的 ids 天然是共现集合，顺手两两 +1，旧账本无 co 字段照常工作 |
| 图谱独立端点，不进 8 秒轮询 | 建图遍历全库，打开页签才取（与 /api/models 同一取舍） |
| 莫兰迪配色 + 酒红画布 `#8e5a5f` | 用户指定风格；刻意不走 --dsw-* token，红底对比度优先 |
| 隔离页深灰紫 `#4d4348` | 警示红在红底上隐身；隔离语义由抽屉文字承载 |
| 路由前缀 `/aico-local-wiki/api/*` | 收编更名（v0.4.0），不与上游 `/learn-wiki` 混用 |

## Verification hooks

- `scripts/verify-graph.mjs`：27 条断言（建图边语义/度数/截断/幂等、布局确定性/边界、
  视觉判据纯函数、真 React 静态渲染的节点边计数）。
- 复跑方式见 `docs/integration-report.md`。
