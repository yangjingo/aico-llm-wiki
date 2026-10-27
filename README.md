# aico-llm-wiki

> aiCo 的「边做边学」本地知识库插件。fork 自 [Dayi-Z/dsh-learn-wiki](https://github.com/Dayi-Z/dsh-learn-wiki)，v0.4.0 起收编为 aiCo 自有插件。

![aico-llm-wiki 知识工作台截图](docs/evidence/workbench-live-knowledge.png)

## 它做什么

把 CRAG 的纠错回路搬到 agent 循环上：

**工作前自动检索 → 卡住时后台限流联网补料 → 蒸馏落暂存 → 人工 commit 升入知识库 → 下次自动命中。**

触发器是**挣扎**（反复失败/撞墙），不是廉价的"检索未命中"——学到的东西沉淀为可溯源的 Markdown 知识页，同一个坑不踩第二次。

## 安装

```powershell
dsh plugin add github:yangjingo/aico-llm-wiki
# 本地开发
dsh plugin add link:D:/myCode/agent/aiCo/aico-local-wiki
```

零构建、纯 JS；宿主依赖只声明为 `peerDependencies`，不要装第二份。

## 核心工具

| 工具 | 作用 |
|---|---|
| `wiki_recall` | 检索知识库（hit / weak / miss 三分桶） |
| `wiki_learn` / `wiki_harvest` | 沉淀知识：单条 / 从对话提炼 |
| `wiki_sessions` | 读历史会话（接手简报 / 跨会话撞墙分析） |
| `wiki_review` / `wiki_commit` | 审阅暂存区 / 固化入知识库 |
| `wiki_lint` / `wiki_merge` | 体检 / 合并知识页 |

## 自检

```powershell
npm run verify:core    # 解析 / 索引 / 打分
npm run verify:loop    # 端到端闭环（防投毒）
npm run verify:render  # UI 结构级渲染测试
```

24 个套件全部离线可跑。

## 文档

详细设计、配置项、标定方法与踩坑记录见：

- [docs/design.md](docs/design.md) — 架构与决策表
- [docs/upstream-readme.md](docs/upstream-readme.md) — 完整版 README（三层架构、设计铁律、阈值标定、挣扎检测设计）
- [docs/spec/](docs/spec/) — 历次方案 spec
- [docs/evidence/](docs/evidence/) — 截图与证据
- [docs/integration-report.md](docs/integration-report.md) — 安装与集成记录
