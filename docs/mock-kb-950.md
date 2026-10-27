# 950 mock 知识库：内容、导入与工作原理

> 本文记录 2026-10-26 导入本仓库的 Atlas 950 SuperPoD 示例知识库：
> 它是什么、怎么进来的、页面格式是什么、以及插件加载后它是怎么被"工作"的。
> 目前进度：**13 页**（10 committed + 1 staged 草稿 + 2 页环境信息），`git` 不追踪（见 `.gitignore`）。

## 1. 它是什么

围绕 `D:\myProj\950` 下真实交付文档（Atlas 950 SuperPoD 用户指南、集群交付一本通、
版本配套表、液冷要求等）构造的一套**示例知识**：

| 目录 | 页数 | 内容 |
|---|---|---|
| `pages/fact/` | 6 | 超节点架构概览、UB 互联拓扑、液冷可部署要求、RM310 机柜管理 + 2 页绿区环境信息 |
| `pages/decision/` | 2 | 交付工具链选型、安全基线三段口径 |
| `pages/lesson/` | 2 | 驱动固件安装顺序坑、液冷巡检水温口径坑 |
| `pages/howto/` | 2 | 首次安装走查、日常巡检例行 |
| `staged/` | 1 | 版本配套要点草稿（模拟两段式暂存态） |

设计要点：

- **sources 指向真实存在的文件**（`D:/myProj/950/...` 的 PDF/XLSX/PPTX），lint 的来源检查不会报失效。
- 页面间用 `[[id]]` 互链，图谱页签有真实连线、无死链。
- 覆盖 4 个分类、confidence 0.4–0.9，方便测试筛选/排序/召回分桶。
- **mock 性质**：正文依据来源文档的文件名与目录结构归纳，细节未经逐字核对；
  confidence 已如实压低，不要当正式交付知识引用。

## 2. 页面格式（导入外部知识就是写这种文件）

每页一个 Markdown，YAML frontmatter + 正文：

```markdown
---
id: my-page-id                # ascii kebab-case，唯一键；中文标题必须显式给 id
title: 页面标题
category: fact                # fact | decision | lesson | howto
confidence: 0.8               # 0.0-1.0
status: committed             # committed（pages/）| staged（staged/）
tags:                         # 列表或逗号分隔
  - atlas-950
sources:                      # 可溯源来源；commit 闸门强制要求
  - D:/myProj/950/xxx.pdf
created: 2026-10-26
updated: 2026-10-26
---

正文 Markdown。互链写 [[目标id]] 或 [[page:目标id]]。
```

**导入方式**：把符合上述格式的 `.md` 放进 `pages/<category>/`（直接生效、参与召回）
或 `staged/`（暂存、不参与召回，经工作台「暂存」页人工 commit 升入 pages/）。
也可以不写文件，直接让 agent 调 `wiki_learn` 工具沉淀。无 `sources` 的页面
**不允许 commit**（防投毒闸门）。

## 3. 怎么接入工作台（wikiRoot）

插件按 `wikiRoot` 找知识库，配置来源：代码默认值 → `<wikiRoot>/wiki.config.json` →
`apply()` 第二参数 / profile 的 `cordis.patch.yml` config 覆盖。

本仓库开发态的接法（两处 profile 都要改，**桌面端用的是 desktop**）：

```yaml
# C:\Users\<user>\.dsh\profiles\desktop\cordis.patch.yml
- id: aico-local-wiki
  name: aico-local-wiki
  config:
    wikiRoot: D:\myCode\agent\aiCo\aico-local-wiki
```

改完**重启 DSH** 生效（装配时读取）。用 `/aico-local-wiki/api/state` 的
`app.wikiRoot` 可验证当前进程用的是哪个根。

> 踩坑记录：桌面 GUI 加载的是 `profiles\desktop`，不是 `profiles\web`——
> 只改 web 的 patch 会出现"配置改了但工作台还是旧库"的假象。

## 4. 它是怎么"工作"的

存储层在 `lib/wiki.js`，约定：

1. **`pages/` 是唯一参与召回的目录**，`staged/` 永不参与（投毒防线）。
2. `loadPages(repoRoot)` 启动/每轮扫描 `pages/<category>/*.md` + `staged/*.md`，
   解析 frontmatter（`parseFrontmatter` 只认标量与 `- ` 列表，解析失败的行原样保留）。
3. **召回**（`lib/recall.js`）：词法打分 + CRAG 三分桶——
   `score ≥ hitThreshold(0.20)` 注入正文、`≥ weakThreshold(0.15)` 只注入标题索引、
   否则记 miss；miss 会进 `gaps/`，按挣扎信号触发后台联网补料。
4. **两段式沉淀**：`wiki_learn`/harvest 先落 `staged/`，人审后 `wiki_commit`
   升入 `pages/`；`lib/lint.js` 负责死链（`[[id]]` 指向不存在的页）、来源失效、
   疑似重复与过期检测。
5. **工作台 UI**（`/aico-wiki`）：知识页签读 `/api/state`（全量正文），
   图谱页签读 `/api/graph`（节点不带正文），8 秒轮询。

验证一条新页面是否被读到，最快的方式：

```powershell
node --input-type=module -e "import {loadPages} from 'file:///D:/myCode/agent/aiCo/aico-local-wiki/lib/wiki.js'; const r=await loadPages('D:/myCode/agent/aiCo/aico-local-wiki'); console.log(r.pages.map(p=>p.status+' '+p.id).join('\n'))"
```
