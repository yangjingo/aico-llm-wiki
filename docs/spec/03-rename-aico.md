# Spec 03 · 收编 aiCo 并更名 aico-llm-wiki

Date: 2026-10-22
Status: **Accepted / Implemented**（`a2910c6`，v0.4.0）
Input: 用户指示「这个插件是 aico 的一个 aico-llm-wiki 的插件」，
并要求结构/文档规范对齐 `@aida/dsh-lld-show-plugin`。

## 决定

上游 [Dayi-Z/dsh-learn-wiki](https://github.com/Dayi-Z/dsh-learn-wiki) v0.3.1（`1d20bd5`）
收编为 aiCo 自有插件，独立演进。

## 更名映射

| 项 | 旧 | 新 |
|----|-----|-----|
| 包名 / 插件 id / 模块 id | dsh-learn-wiki | aico-llm-wiki |
| 源码目录 | — | `D:\myCode\agent\aiCo\aico-llm-wiki`（git 保留上游历史） |
| HTTP 路由前缀 | `/learn-wiki/api/*` | `/aico-llm-wiki/api/*` |
| UI 显示名 | learn-wiki | aico-wiki |
| 日志文件 | `.learn-wiki.log` | `.aico-llm-wiki.log` |
| 版本 | 0.3.1 | 0.4.0 |

**不变**：工具名（wiki_recall / wiki_learn / wiki_commit 等）、wiki 目录结构
（pages/ + staged/ + usage.json）、上游 README/PRODUCT/CHANGELOG（原样保留为上游 spec）。

## 安装模式（对齐 aida-lld）

- `dsh plugin --profile desktop add link:D:\myCode\agent\aiCo\aico-llm-wiki`
  （受管理 bundle 依赖，加载条目由插件自带 cordis.patch.yml 提供）。
- profile 的 cordis.patch.yml 只做 config 覆盖（wikiRoot），不手动 insert。
- ⚠️ 桌面宿主用 **desktop** profile——详见 docs/integration-report.md 第 3 节事故记录。

## 文档规范（对齐 aida-lld 的 docs/ 组织）

```
docs/
├── design.md              # aiCo 增量的架构与决策
├── test-cases.md          # TC-* 与 verify 脚本断言一一对应
├── integration-report.md  # 安装门禁 + 事故记录 + 重启后验证清单
├── spec/                  # 历次用户确认的 spec（本目录，按编号递增）
├── evidence/              # 截图/HTML 证据
└── verification/          # verify 运行产物（JSON）
```
