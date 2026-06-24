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
   - `https://why-sync-api-xingran.onrender.com/ready` 应返回 `{"status":"ready", ...}`。
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
Invoke-RestMethod http://127.0.0.1:8787/ready
npm.cmd run test:server
```

## 后端接口

公开接口：

- `GET /health`：轻量存活检查，不访问存储。
- `GET /ready`：就绪检查，会读取持久存储。
- `GET /api/status`：服务版本、运行时间、是否启用管理员接口。
- `GET /api/version`：当前 App 更新信息。
- `GET /api/leaderboard`：排行榜。
- `POST /api/players/sync`：同步玩家资料与刷题数，刷题数只增不减。

管理员接口需要设置 `ADMIN_TOKEN`，并在请求中带上
`X-Admin-Token: <ADMIN_TOKEN>` 或 `Authorization: Bearer <ADMIN_TOKEN>`：

- `GET /api/admin/export`：导出完整排行榜文档。
- `POST /api/admin/backup`：手动创建 Gist 备份文件。
- `GET /api/admin/backups`：列出备份文件。
- `DELETE /api/admin/players/{playerId}`：删除单个玩家，删除前自动备份。
- `POST /api/admin/reset`：清空排行榜，清空前自动备份。

如果 Render 里没有设置 `ADMIN_TOKEN`，管理员接口会返回 503，普通 App 同步不受影响。

## 故障切换

如果 Render 地址需要更换，只需修改 `network-config.json` 中的 `apiBases` 并推送
到 `main`。App 会缓存配置 6 小时；主地址失败时会强制刷新配置并尝试新地址。

旧版 v2.0.0 的版本检查 Blob 也已失效，因此旧用户首次升级到 v2.1.0 需要手动安装；
从 v2.1.0 起，后续版本检查改走动态配置。
