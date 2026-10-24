# aico-local-wiki Integration Report

Date: 2026-10-22
Plugin: `aico-local-wiki@0.4.0`（link 安装）
Harness: DeepSeek Harness desktop 0.2.1-rc.2（`D:\app\DeepSeek Harness`）

## 1. Plugin local gates

```powershell
cd D:\myCode\agent\aiCo\aico-local-wiki
pnpm install
$env:DSH_APP_MODULES = "C:\Users\y00842095\.dsh\profiles\web\node_modules"  # react 来源（渲染测试用）
pnpm run verify:graph    # 27 条断言
pnpm run verify:render
pnpm run verify:plugin
```

Observed:

```text
verify:graph   : ALL PASS（27/27）
verify:render  : ALL PASS
verify:plugin  : ALL PASS
verify-ui-api  : 4 failures — 环境依赖（工具目录需活 DSH 会话），上游 HEAD 同样失败，非本次引入
```

## 2. Installation（desktop profile）

```powershell
dsh plugin --profile desktop allow-version aico-local-wiki@0.4.0 --dsh-version 0.2.1-rc.2 --accept-risk
dsh plugin --profile desktop add link:D:\myCode\agent\aiCo\aico-local-wiki
```

- profile `desktop` 的 `package.json` bundles 含 `aico-local-wiki`，dependencies 为 link。
- `cordis.patch.yml` 只做 config 覆盖：`wikiRoot: C:\Users\y00842095\Desktop\proj\mt\llm-wiki`。

## 3. 事故记录：装错 profile（根因）

**现象**：插件装在 profile `web`，但桌面宿主（`DeepSeek Harness.exe` → dsh-desktop-host）
实际运行的是 profile `desktop`（启动参数第 3 节可见）。重启后
`/aico-local-wiki/api/*` 全部 404，`<wikiRoot>/.aico-local-wiki.log` 不存在
（apply 从未执行）。对照组：`@aida/*` 系列全部装在 desktop profile，路由 200。

**判据**（复排时按序执行）：

1. 找宿主实际 profile：`Get-NetTCPConnection -LocalPort <gui端口> -State Listen`
   → `Win32_Process CommandLine` 第 4 个参数即 profile 路径。
2. 探活：`GET /aico-local-wiki/api/pending` → 404 = host 半未加载。
3. `<wikiRoot>/.aico-local-wiki.log` 不存在 = apply 未跑。

**修复**：改用 `--profile desktop` 安装（见上节）。web profile 里的旧安装已移除。

## 3.5 事故记录 2：版本豁免双精确（2026-10-25）

**现象**：应用重启后 aico-local-wiki 全部路由 404、`<wikiRoot>/.aico-local-wiki.log`
无任何新行（apply 未执行），而同 profile 的 @aida/* 插件全部正常。

**根因**：`compatibility.json` 的豁免是「**包版本 × 宿主版本**」双精确匹配——
记录的是 `aico-local-wiki@0.4.0 × 0.2.1-rc.2`；包升到 0.5.0、宿主升级到
0.2.1-rc.3 后，新进程启动时两项都不匹配 → profile startup 静默拒载（无错误
输出、无日志；唯一痕迹是宿主重写 cordis.yml）。

**判据**：
1. 同 profile 其它插件正常、本插件路由全 404 → 先查 `profiles/<p>/compatibility.json`；
2. `dsh plugin --profile desktop allow-version aico-local-wiki@<包版本> --dsh-version <实际宿主版本> --accept-risk`；
3. ⚠️ CLI 提示的 dsh-version 可能与桌面宿主实际版本不同步，以报错信息里的
   实际版本为准重试；
4. 豁免后**必须重启桌面应用**——宿主只在启动时装载 bundle，`remove+add link`
   不会热重载（已实测）。

**预防**：每次 bump package.json version 后，同步重授豁免（进发布流程）。

## 4. Post-restart verification

重启桌面应用后按序验证：

- [ ] `GET http://127.0.0.1:<port>/aico-local-wiki/api/pending` → 200
- [ ] `GET .../api/graph` → 200，`stats.nodes ≥ 2`（llm-wiki 现有 2 页）
- [ ] 侧栏 aico-wiki 入口 → 「图谱」页签出图（莫兰迪 + 酒红底）
- [ ] 点节点 → 抽屉正文；「在知识页签查看」跳转展开

## 5. Evidence

- `docs/evidence/graph-preview-morandi.png` — 图谱页签离线渲染截图（夹具数据，
  真组件树 + 真主题 token；原语为替身，控件外观不代表真实应用）。
- `docs/evidence/graph-preview-morandi.html` — 同源 HTML。
