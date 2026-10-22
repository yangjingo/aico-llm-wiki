# Spec 05 · 前端视觉重制（华为红三色体系）

Date: 2026-10-22
Status: **Accepted / Implemented**（v0.5.0）
Input: 用户给出完整 design-system.md + huawei-style.md，并确认「全套换华为红体系」。
**本 spec 取代 spec 02（莫兰迪+酒红画布）**。

## 体系映射（design-system → 插件 UI）

| design-system | 插件实现 |
|---|---|
| 品牌红 `#b5333b` | `--lw-brand`：标题强调、focus、选中、co 边、表头底色、真警示（`--lw-bad` 同值——华为体系里警示红即品牌红） |
| 辅红 `#cf6b72` | `--lw-warn`（weak 档、howto 节点） |
| 强调蓝 `#1565c0` | `--lw-info`（点睛：decision 节点、链接、「进行中」状态——「答案/是…」类语义） |
| 灰蓝 `#566472` | `--lw-fg3` 次要文字 + `--lw-ok`（确认态）+ lesson 节点 + tag 边 |
| 深字 `#1a1a1c` / 正文灰 `#585860` | `--lw-fg` / `--lw-fg2` |
| 浅底 `#fff` / `#fafafa` | `--lw-surface` / `--lw-raise` / 图谱画布 `GBG` |
| 细边 `#e7e7e7` / `#d5d9de` | `--lw-line-soft` / `--lw-line` |
| 表头红底白字居中粗体 | `.lw-th`：`#b5333b` 底 + 白字 + 700 + center（表格=独立语汇，不沿用卡片浅灰边） |
| 双字体铁律 | 全局 `'Noto Sans SC',sans-serif`；mono 位 `'JetBrains Mono','Noto Sans SC',monospace`（中文绝不只挂 mono） |
| 去花花绿绿 | 上一版的绿（--lw-ok #3ecf8e）、橙（warn）、亮蓝（info）全部映射进三色体系 |

## 图谱重制（取代 spec 02）

| 元素 | 新色 |
|---|---|
| 画布 | `#fafafa` 浅底 + `#d5d9de` 细边 |
| fact / decision / lesson / howto | `#b5333b` / `#1565c0` / `#566472` / `#cf6b72` |
| co 边 | 品牌红实线（本图最强信号）；tag 边灰蓝虚线 |
| 选中描边 | `#1a1a1c`；隔离节点 = 灰底 `#c9ced4` + 品牌红描边（红只给警示，语义正确） |

## 与既有验证规则的有意冲突（裁定记录）

- `verify-client-tokens.mjs` 的「颜色必须来自 --dsw-* token / 字面色只许在回退位」
  规则**被本 spec 有意突破**：体系要求固定白底红焦点，跟主题换色会破坏三色纪律。
  该测试本机因找不到 DSH 应用目录而整体 FAIL（上游基线同样 5 FAIL），暂不改其断言；
  若未来在本机可跑，需按本 spec 更新其豁免清单。
- 字号刻度沿用 DSH token 的 px 阶梯（UI 数据密集场景，21px 散文地板是投屏讲课题阈，
  不适用于工具面板；字体族铁律已执行）。

## 验收

- verify:graph 27/27（边色断言已更新为品牌红体系）、verify:render ALL PASS。
- 新预览证据：docs/evidence/graph-preview-huawei-red.png。
