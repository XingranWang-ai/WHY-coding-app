# Why 联网恢复与部署

## 架构

- Android App：答题数先写入本机 `localStorage`，再异步同步。
- 同步 API：校验请求、限流、串行合并排行榜，并确保答题数只增不减。
- 持久存储：私有 GitHub Gist，客户端无法读取服务器令牌。
- 动态配置：仓库根目录 `network-config.json`，可在不更新 APK 的情况下切换 API。

## Render 首次部署

1. 确认本次修复已经推送到 GitHub `main` 分支。
2. 打开：
   `https://dashboard.render.com/blueprint/new?repo=https://github.com/XingranWang-ai/WHY-coding-app`
3. 应用 Blueprint，填写以下两个 Secret：
   - `GITHUB_TOKEN`：建议使用仅带 `gist` 权限的 GitHub classic token。
   - `LEADERBOARD_GIST_ID`：`91c91e54dd409f074afbbf4c39328c0b`
4. 等待 `why-sync-api-xingran` 状态变为 Live。
5. 验证：
   - `https://why-sync-api-xingran.onrender.com/health` 应返回 `{"status":"ok"}`。
   - `https://why-sync-api-xingran.onrender.com/api/leaderboard` 应返回排行榜 JSON。

## 本地验证

```powershell
$env:GITHUB_TOKEN = '<gist-token>'
$env:LEADERBOARD_GIST_ID = '91c91e54dd409f074afbbf4c39328c0b'
npm.cmd run server:start
```

另开终端执行：

```powershell
Invoke-RestMethod http://127.0.0.1:8787/health
npm.cmd run test:server
```

## 故障切换

如果 Render 地址需要更换，只需修改 `network-config.json` 中的 `apiBases` 并推送
到 `main`。App 会缓存配置 6 小时；主地址失败时会强制刷新配置并尝试新地址。

旧版 v2.0.0 的版本检查 Blob 也已失效，因此旧用户首次升级到 v2.1.0 需要手动安装；
从 v2.1.0 起，后续版本检查改走动态配置。
