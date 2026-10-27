# Test Cases

> 对应实现：`lib/graph.js`、`index.js` 路由、`client/client.js` GraphTab。
> 全部断言在 `scripts/verify-graph.mjs`，`pnpm run verify:graph` 一键复跑。

## TC-01 建图语义（buildGraph）

- 共享标签的两页产生 tag 边；同标签 k 页两两成边（C(k,2)）。
- `usage.co` 里 `a|b: n`（n ≥ minCo）产生 co 计数；co ≥ tag 时边 type 为 `co`。
- 同一对页面只保留一条边（tag/co 合并，weight = tag + co）。
- 无标签无共现的页面 degree 为 0（孤立节点仍在 nodes 里）。
- stats 口径：nodes/edges/isolated/coEdges/tagEdges/counts 逐项可断言。
- `maxEdges` 截断按 weight 降序保留最重的边；同 weight 按 id 稳定排序。
- 幂等：同一份输入两次建图 JSON 相等；空输入不崩。

## TC-02 布局（graphLayout）

- 确定性：同一份图两次布局逐坐标相等（无 Math.random，种子为节点序号）。
- 全部坐标归一化进画布（padding 26px）。
- 相连节点（有弹簧）的平均距离 < 与孤立节点的距离。
- 单节点 / 零节点不崩。

## TC-03 视觉判据（纯函数）

- `graphNodeRadius`：hits=0 → 5px，随命中单调增长，封顶 14px。
- `graphLabelWorthy`：仅 选中/有度/有命中/暂存 的节点画标签。
- `graphLabelCut`：超长标题截断加省略号。
- `graphEdgeStyle`：co 奶油白实线 `#e8d3c6`（红底高对比），tag 暗灰红虚线 `3 3`；
  与选中节点无关的边透明度压到 ≤ 0.15；透明度按 weight 分三档。

## TC-04 Host API

- `GET /aico-llm-wiki/api/graph` 返回 200，`ok: true`。
- 响应含 `nodes`（带 x/y 坐标）、`edges`、`stats`、`width/height`。
- `?maxEdges=N` 截断生效。
- 建图不进 8 秒轮询（打开页签才请求）。

## TC-05 客户端渲染（真 React 静态渲染）

- GraphTab 受控模式（`props.graph`）不崩，画出 `<svg viewBox>`。
- `<circle>` 数 = 节点数；`<line>` 数 = 边数。
- `aria-label` 带规模（「知识图谱：N 个页面，M 条连边」）。
- 无选中时不画抽屉；PanelBody `initialTab='graph'` 渲染不崩；TABS 含 graph。

## TC-06 v2：目录树 / vendor 静态路由 / 溯源（verify-ui-v2.mjs）

- `/api/tree`：200；`tree.pages.fact['env-vm.md']` 为叶子（`__leaf` + id/title）；staged 叶子带 `status=staged`。
- `/api/state`：committed 带 `srcs`（含 `session://` 锚点与 URL）；staged 同样带 `srcs`。
- `/vendor/d3.min.js`：200 且含 `forceSimulation`/`zoom`（图谱交互真正依赖的 API）。
- ★ 越界守卫：`/vendor/../../package.json` 与白名单外后缀 → 404（resolveWithin + MIME 白名单）。
- `/api/graph`（handler 级）：节点带服务端布局坐标；stats 口径正确。
- `sourceKind`：session:// → 会话；URL → 链接（带 href）；路径 → 文档。
- 渲染：知识表「来源」列 chips 带类型（会话/链接）；URL 渲染为可点链接。
