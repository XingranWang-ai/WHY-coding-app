# WHY 本地后端管理台

这个管理台是一个只监听本机的网页，用来管理线上同步后端里的用户数据。

它不会把 `ADMIN_TOKEN` 写进代码，也不会把管理页面发布到线上。网页打开在你的电脑上，通过本机 Node 代理访问 Render 后端，所以不会被浏览器 CORS 限制卡住。

## 启动

```powershell
cd C:\Users\Lenovo\Desktop\2026作业\WhyApp
npm.cmd run admin
```

然后打开：

```text
http://127.0.0.1:8790
```

默认连接的后端是：

```text
https://why-sync-api-xingran.onrender.com
```

如果要改端口或默认后端：

```powershell
$env:WHY_ADMIN_PORT = '8791'
$env:WHY_ADMIN_API_BASE = 'https://why-sync-api-xingran.onrender.com'
$env:WHY_ADMIN_PROXY_TIMEOUT_MS = '35000'
npm.cmd run admin
```

## 需要的 Render 环境变量

管理接口必须在 Render 服务里配置：

```text
ADMIN_TOKEN=<你自己生成的一段强随机密钥>
```

没有配置时，普通 App 同步不受影响，但管理页面里的导出、备份、编辑、删除、清空会返回 `Admin API is not configured`。

可在 PowerShell 生成一个 token：

```powershell
[Convert]::ToHexString((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

把生成结果填到 Render 的 `ADMIN_TOKEN` 环境变量里，然后让服务重新部署。

## 管理台功能

- 查看服务状态、管理接口是否开启、用户数、更新时间
- 读取公开榜单；填写 `ADMIN_TOKEN` 后读取完整管理导出
- 手动创建 Gist 备份
- 下载当前 leaderboard JSON
- 搜索用户昵称或玩家 ID
- 编辑用户昵称和完成题数
- 清除用户头像
- 批量导入 CSV / TSV / JSON / TXT 文档中的姓名、头像、题数
- 删除单个用户，删除前自动备份
- 列出备份文件
- 清空榜单，清空前自动备份，并要求输入 `RESET` 二次确认

## 批量导入格式

最推荐用 CSV：

```csv
姓名,头像,题数
张三,,12
李四,"data:image/png;base64,...",8
```

也支持 TSV、TXT，以及 JSON：

```json
[
  { "nickname": "张三", "solved": 12 },
  { "nickname": "李四", "avatar": "data:image/png;base64,...", "solved": 8 }
]
```

说明：

- 头像列可以留空，留空表示不改头像。
- 头像必须是 `data:image/png;base64,...`、`data:image/jpeg;base64,...` 或 `data:image/webp;base64,...`。
- 如果没有玩家 ID，导入时会优先按昵称匹配已有用户；匹配不到则创建一个稳定的导入用户 ID。
- 真正写入前会先显示预览和错误行，并要求二次确认。

## 安全边界

- 本地服务只绑定 `127.0.0.1`，局域网其他机器不能直接访问。
- `ADMIN_TOKEN` 默认只保存在页面内存里；勾选“本次浏览器会话内记住 Token”时，只写入 `sessionStorage`，关闭浏览器会话后消失。
- 本机代理只允许访问后端管理需要的固定路径，不是通用任意代理。
