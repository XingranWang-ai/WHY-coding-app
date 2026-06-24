import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'

const DEFAULT_API_BASE = process.env.WHY_ADMIN_API_BASE ??
  'https://why-sync-api-xingran.onrender.com'
const DEFAULT_PORT = Number.parseInt(process.env.WHY_ADMIN_PORT ?? '8790', 10)
const MAX_PROXY_BODY_BYTES = 64_000
const PROXY_TIMEOUT_MS = Number.parseInt(process.env.WHY_ADMIN_PROXY_TIMEOUT_MS ?? '35000', 10)
const MAX_AVATAR_DATA_URL_LENGTH = 9_000
const ALLOWED_METHODS = new Set(['GET', 'POST', 'PATCH', 'DELETE'])

function isAllowedProxyPath(pathname) {
  return [
    '/health',
    '/ready',
    '/api/status',
    '/api/version',
    '/api/leaderboard',
    '/api/admin/export',
    '/api/admin/backups',
    '/api/admin/backup',
    '/api/admin/reset',
  ].includes(pathname) || /^\/api\/admin\/players\/[^/]+$/.test(pathname)
}

function send(response, status, body, contentType = 'text/plain; charset=utf-8') {
  response.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(body)
}

function sendJson(response, status, value) {
  send(response, status, JSON.stringify(value), 'application/json; charset=utf-8')
}

async function readProxyBody(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > MAX_PROXY_BODY_BYTES) {
      const error = new Error('Request body is too large')
      error.status = 413
      throw error
    }
    chunks.push(chunk)
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined
}

function parseTargetUrl(url) {
  const rawBase = url.searchParams.get('base') || DEFAULT_API_BASE
  const rawPath = url.searchParams.get('path') || '/'
  const base = new URL(rawBase)
  if (!['http:', 'https:'].includes(base.protocol)) {
    throw Object.assign(new Error('Only http/https API bases are allowed'), { status: 400 })
  }
  if (
    !rawPath.startsWith('/') ||
    rawPath.startsWith('//') ||
    /^[a-z][a-z\d+.-]*:/i.test(rawPath)
  ) {
    throw Object.assign(new Error('Invalid proxy path'), { status: 400 })
  }
  const target = new URL(rawPath, base)
  if (target.origin !== base.origin) {
    throw Object.assign(new Error('Proxy path must stay under the configured API base'), {
      status: 400,
    })
  }
  if (!isAllowedProxyPath(target.pathname)) {
    throw Object.assign(new Error('This backend path is not available from the admin console'), {
      status: 404,
    })
  }
  return target
}

async function proxyRequest(request, response, url) {
  if (!ALLOWED_METHODS.has(request.method)) {
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }

  const target = parseTargetUrl(url)
  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await readProxyBody(request)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS)
  try {
    const headers = {
      Accept: 'application/json',
      'User-Agent': 'why-local-admin-console',
    }
    const contentType = request.headers['content-type']
    if (contentType) headers['Content-Type'] = contentType
    const adminToken = request.headers['x-admin-token']
    if (typeof adminToken === 'string' && adminToken.trim()) {
      headers['X-Admin-Token'] = adminToken.trim()
    }

    const backendResponse = await fetch(target, {
      method: request.method,
      headers,
      body,
      signal: controller.signal,
    })
    const text = await backendResponse.text()
    send(
      response,
      backendResponse.status,
      text,
      backendResponse.headers.get('content-type') || 'application/json; charset=utf-8',
    )
  } finally {
    clearTimeout(timeout)
  }
}

function adminHtml() {
  return String.raw`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WHY 后端管理台</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7fb;
      --panel: #ffffff;
      --panel-strong: #111827;
      --text: #101827;
      --muted: #667085;
      --line: #e5e7eb;
      --accent: #7c3aed;
      --accent-2: #06b6d4;
      --danger: #dc2626;
      --ok: #16a34a;
      --warning: #d97706;
      --shadow: 0 18px 55px rgba(15, 23, 42, 0.08);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background:
        radial-gradient(circle at 10% 0%, rgba(124, 58, 237, 0.14), transparent 30%),
        radial-gradient(circle at 90% 5%, rgba(6, 182, 212, 0.14), transparent 28%),
        var(--bg);
      color: var(--text);
      min-height: 100vh;
    }
    button, input, textarea {
      font: inherit;
    }
    button {
      border: 0;
      border-radius: 12px;
      padding: 10px 14px;
      background: #eef2ff;
      color: #312e81;
      cursor: pointer;
      font-weight: 700;
      transition: transform 150ms ease, box-shadow 150ms ease, background 150ms ease;
    }
    button:hover { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(15, 23, 42, 0.10); }
    button:disabled { cursor: not-allowed; opacity: 0.55; transform: none; box-shadow: none; }
    .primary { background: linear-gradient(135deg, var(--accent), #5b21b6); color: white; }
    .danger { background: #fee2e2; color: #991b1b; }
    .danger.primary { background: linear-gradient(135deg, #ef4444, #b91c1c); color: white; }
    .ghost { background: #f8fafc; color: #344054; border: 1px solid var(--line); }
    .shell { width: min(1280px, calc(100vw - 32px)); margin: 0 auto; padding: 28px 0 42px; }
    header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 20px;
    }
    h1 { margin: 0; font-size: clamp(30px, 4vw, 48px); letter-spacing: -0.04em; }
    .subtitle { margin: 8px 0 0; color: var(--muted); max-width: 780px; line-height: 1.7; }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: rgba(255,255,255,0.72);
      color: var(--muted);
      white-space: nowrap;
      font-weight: 700;
    }
    .dot { width: 9px; height: 9px; border-radius: 99px; background: var(--warning); }
    .dot.ok { background: var(--ok); }
    .dot.bad { background: var(--danger); }
    .panel {
      background: rgba(255, 255, 255, 0.88);
      border: 1px solid rgba(229, 231, 235, 0.9);
      box-shadow: var(--shadow);
      backdrop-filter: blur(16px);
      border-radius: 24px;
    }
    .settings {
      padding: 18px;
      display: grid;
      grid-template-columns: minmax(260px, 1.2fr) minmax(220px, 0.9fr) auto;
      gap: 12px;
      align-items: end;
      margin-bottom: 18px;
    }
    label { display: block; color: #344054; font-weight: 800; font-size: 13px; margin-bottom: 8px; }
    input, textarea {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 12px 13px;
      background: white;
      color: var(--text);
      outline: none;
    }
    input:focus, textarea:focus { border-color: #a78bfa; box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.12); }
    .token-row { display: flex; gap: 10px; align-items: center; }
    .token-row input[type="checkbox"] { width: auto; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .message {
      padding: 12px 14px;
      margin-bottom: 18px;
      border-radius: 16px;
      color: #344054;
      background: #fff7ed;
      border: 1px solid #fed7aa;
      display: none;
      line-height: 1.6;
    }
    .message.show { display: block; }
    .message.ok { background: #ecfdf3; border-color: #bbf7d0; color: #166534; }
    .message.bad { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
    .stat { padding: 16px; }
    .stat .label { color: var(--muted); font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
    .stat .value { margin-top: 6px; font-size: 24px; font-weight: 900; letter-spacing: -0.03em; }
    .workspace { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 18px; align-items: start; }
    .table-panel { overflow: hidden; }
    .toolbar {
      padding: 16px;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      border-bottom: 1px solid var(--line);
    }
    .toolbar input { max-width: 360px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 13px 16px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: middle; }
    th { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; background: #f8fafc; }
    tr { transition: background 120ms ease; }
    tbody tr:hover { background: #faf5ff; }
    tbody tr.selected { background: #f3e8ff; }
    .user { display: flex; align-items: center; gap: 12px; min-width: 220px; }
    .avatar {
      width: 38px;
      height: 38px;
      border-radius: 14px;
      object-fit: cover;
      background: linear-gradient(135deg, #ddd6fe, #cffafe);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #5b21b6;
      font-weight: 900;
      flex: 0 0 auto;
    }
    .nickname { font-weight: 900; }
    .id { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: var(--muted); font-size: 12px; overflow-wrap: anywhere; }
    .score { font-size: 22px; font-weight: 950; letter-spacing: -0.04em; }
    .side { padding: 18px; position: sticky; top: 16px; }
    .side h2 { margin: 0 0 12px; font-size: 22px; letter-spacing: -0.03em; }
    .field { margin-bottom: 13px; }
    .avatar-editor {
      display: grid;
      grid-template-columns: 76px 1fr;
      gap: 12px;
      align-items: center;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: #f8fafc;
      margin-bottom: 13px;
    }
    .avatar-preview {
      width: 68px;
      height: 68px;
      border-radius: 22px;
      object-fit: cover;
      background: linear-gradient(135deg, #ddd6fe, #cffafe);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #5b21b6;
      font-size: 24px;
      font-weight: 950;
      box-shadow: inset 0 0 0 1px rgba(124, 58, 237, 0.12);
    }
    .avatar-tools { display: grid; gap: 8px; }
    .file-input {
      padding: 10px;
      border-style: dashed;
      background: #fff;
    }
    .avatar-note { color: var(--muted); font-size: 12px; line-height: 1.5; }
    .side-actions { display: grid; gap: 10px; }
    .empty { color: var(--muted); line-height: 1.7; padding: 18px; }
    .backups { margin-top: 18px; padding: 16px; }
    .backup-list { margin: 10px 0 0; padding-left: 18px; color: var(--muted); line-height: 1.8; overflow-wrap: anywhere; }
    .small { color: var(--muted); font-size: 12px; line-height: 1.6; }
    @media (max-width: 980px) {
      .settings, .workspace, .stats { grid-template-columns: 1fr; }
      header { flex-direction: column; }
      .side { position: static; }
      .toolbar { flex-direction: column; align-items: stretch; }
      th, td { padding: 10px 12px; }
      .user { min-width: 0; }
      .score { font-size: 20px; }
      th:nth-child(3), td:nth-child(3),
      th:nth-child(4), td:nth-child(4) { display: none; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <header>
      <div>
        <h1>WHY 后端管理台</h1>
        <p class="subtitle">本页面只在你的电脑上运行。它通过本机代理连接线上同步后端，用于查看榜单、备份、编辑昵称/分数、删除用户和清空榜单。</p>
      </div>
      <div class="chip" id="statusChip"><span class="dot"></span><span>未连接</span></div>
    </header>

    <section class="panel settings">
      <div>
        <label for="apiBase">后端 API 地址</label>
        <input id="apiBase" autocomplete="off">
      </div>
      <div>
        <label for="adminToken">ADMIN_TOKEN</label>
        <input id="adminToken" type="password" autocomplete="off" placeholder="只保存在本机页面内存">
        <div class="token-row small" style="margin-top:8px">
          <input id="rememberToken" type="checkbox">
          <span>本次浏览器会话内记住 Token</span>
        </div>
      </div>
      <div class="actions">
        <button class="primary" id="refreshButton">连接 / 刷新</button>
        <button class="ghost" id="backupButton">手动备份</button>
        <button class="ghost" id="downloadButton">下载 JSON</button>
      </div>
    </section>

    <div class="message" id="message"></div>

    <section class="stats">
      <div class="panel stat"><div class="label">服务状态</div><div class="value" id="serviceStat">--</div></div>
      <div class="panel stat"><div class="label">管理接口</div><div class="value" id="adminStat">--</div></div>
      <div class="panel stat"><div class="label">用户数</div><div class="value" id="playersStat">--</div></div>
      <div class="panel stat"><div class="label">更新时间</div><div class="value" id="updatedStat">--</div></div>
    </section>

    <section class="workspace">
      <div class="panel table-panel">
        <div class="toolbar">
          <div>
            <strong>用户列表</strong>
            <div class="small" id="sourceHint">先连接后端。</div>
          </div>
          <input id="searchInput" placeholder="搜索昵称或玩家 ID">
        </div>
        <table>
          <thead>
            <tr>
              <th>用户</th>
              <th>题数</th>
              <th>更新时间</th>
              <th>玩家 ID</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody id="playersBody">
            <tr><td colspan="5" class="empty">暂无数据。</td></tr>
          </tbody>
        </table>
      </div>

      <aside class="panel side" id="detailPanel">
        <div class="empty">选择一个用户后，可以编辑昵称/题数，或删除该用户。删除和编辑前后端会自动创建备份。</div>
      </aside>
    </section>

    <section class="panel backups">
      <div class="actions">
        <button class="ghost" id="backupsButton">查看备份文件</button>
        <button class="danger" id="resetButton">清空榜单</button>
      </div>
      <ul class="backup-list" id="backupList"></ul>
      <p class="small">危险操作会要求二次确认。建议先点“手动备份”，确认备份成功后再删用户或清空榜单。</p>
    </section>
  </main>

  <script>
    const DEFAULT_API_BASE = ${JSON.stringify(DEFAULT_API_BASE)};
    const MAX_AVATAR_DATA_URL_LENGTH = ${MAX_AVATAR_DATA_URL_LENGTH};
    const state = {
      status: null,
      ready: null,
      document: null,
      selectedId: '',
      pendingAvatarData: '',
      pendingAvatarRemoval: false,
      loadedFromAdmin: false,
      busy: false
    };

    const els = {
      apiBase: document.getElementById('apiBase'),
      adminToken: document.getElementById('adminToken'),
      rememberToken: document.getElementById('rememberToken'),
      refreshButton: document.getElementById('refreshButton'),
      backupButton: document.getElementById('backupButton'),
      downloadButton: document.getElementById('downloadButton'),
      backupsButton: document.getElementById('backupsButton'),
      resetButton: document.getElementById('resetButton'),
      searchInput: document.getElementById('searchInput'),
      message: document.getElementById('message'),
      statusChip: document.getElementById('statusChip'),
      serviceStat: document.getElementById('serviceStat'),
      adminStat: document.getElementById('adminStat'),
      playersStat: document.getElementById('playersStat'),
      updatedStat: document.getElementById('updatedStat'),
      sourceHint: document.getElementById('sourceHint'),
      playersBody: document.getElementById('playersBody'),
      detailPanel: document.getElementById('detailPanel'),
      backupList: document.getElementById('backupList')
    };

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, function (char) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
      });
    }

    function formatDate(value) {
      if (!value) return '--';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleString('zh-CN', { hour12: false });
    }

    function setBusy(isBusy) {
      state.busy = isBusy;
      [
        els.refreshButton,
        els.backupButton,
        els.downloadButton,
        els.backupsButton,
        els.resetButton
      ].forEach(function (button) {
        button.disabled = isBusy;
      });
    }

    function setMessage(text, type) {
      els.message.textContent = text || '';
      els.message.className = 'message' + (text ? ' show' : '') + (type ? ' ' + type : '');
    }

    function settings() {
      return {
        base: els.apiBase.value.trim() || DEFAULT_API_BASE,
        token: els.adminToken.value.trim()
      };
    }

    function saveSettings() {
      localStorage.setItem('whyAdminApiBase', settings().base);
      if (els.rememberToken.checked) {
        sessionStorage.setItem('whyAdminToken', settings().token);
      } else {
        sessionStorage.removeItem('whyAdminToken');
      }
    }

    async function proxy(path, options) {
      const opts = options || {};
      const current = settings();
      const headers = { Accept: 'application/json' };
      if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
      if (opts.admin) {
        if (!current.token) throw new Error('先填写 ADMIN_TOKEN。');
        headers['X-Admin-Token'] = current.token;
      }
      const response = await fetch('/proxy?base=' + encodeURIComponent(current.base) + '&path=' + encodeURIComponent(path), {
        method: opts.method || 'GET',
        headers: headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body)
      });
      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }
      if (!response.ok) {
        const reason = data && data.error ? data.error : '请求失败';
        throw new Error(reason + ' (HTTP ' + response.status + ')');
      }
      return data;
    }

    function playerList() {
      const query = els.searchInput.value.trim().toLowerCase();
      const players = (state.document && Array.isArray(state.document.players)) ? state.document.players.slice() : [];
      players.sort(function (a, b) {
        if (b.solved !== a.solved) return b.solved - a.solved;
        return String(b.updatedAt).localeCompare(String(a.updatedAt));
      });
      if (!query) return players;
      return players.filter(function (player) {
        return String(player.nickname).toLowerCase().includes(query) ||
          String(player.id).toLowerCase().includes(query);
      });
    }

    function selectedPlayer() {
      const players = (state.document && Array.isArray(state.document.players)) ? state.document.players : [];
      return players.find(function (player) { return player.id === state.selectedId; }) || null;
    }

    function avatarMarkup(player) {
      if (player.avatar) {
        return '<img class="avatar" src="' + escapeHtml(player.avatar) + '" alt="">';
      }
      const initial = String(player.nickname || '?').slice(0, 1).toUpperCase();
      return '<span class="avatar">' + escapeHtml(initial) + '</span>';
    }

    function avatarPreviewMarkup(player) {
      const avatar = state.pendingAvatarRemoval ? '' : (state.pendingAvatarData || player.avatar);
      if (avatar) {
        return '<img class="avatar-preview" src="' + escapeHtml(avatar) + '" alt="头像预览">';
      }
      const initial = String(player.nickname || '?').slice(0, 1).toUpperCase();
      return '<span class="avatar-preview">' + escapeHtml(initial) + '</span>';
    }

    function setSelectedPlayer(playerId) {
      if (state.selectedId !== playerId) {
        state.pendingAvatarData = '';
        state.pendingAvatarRemoval = false;
      }
      state.selectedId = playerId;
      render();
    }

    function renderStatus() {
      const connected = Boolean(state.status);
      const adminEnabled = Boolean(state.status && state.status.adminEnabled);
      const chipDot = els.statusChip.querySelector('.dot');
      const chipText = els.statusChip.querySelector('span:last-child');
      chipDot.className = 'dot ' + (connected ? 'ok' : 'bad');
      chipText.textContent = connected ? '已连接' : '未连接';
      els.serviceStat.textContent = connected ? 'OK' : '--';
      els.adminStat.textContent = connected ? (adminEnabled ? '已开启' : '未开启') : '--';
      const count = state.document && Array.isArray(state.document.players) ? state.document.players.length : '--';
      els.playersStat.textContent = count;
      els.updatedStat.textContent = state.document ? formatDate(state.document.updatedAt) : '--';
      els.sourceHint.textContent = state.loadedFromAdmin
        ? '数据来自管理导出接口。'
        : '数据来自公开榜单接口；填写 ADMIN_TOKEN 后可编辑。';
    }

    function renderPlayers() {
      const players = playerList();
      if (!players.length) {
        els.playersBody.innerHTML = '<tr><td colspan="5" class="empty">没有匹配的用户。</td></tr>';
        return;
      }
      els.playersBody.innerHTML = players.map(function (player) {
        const selected = player.id === state.selectedId ? ' class="selected"' : '';
        return '<tr' + selected + ' data-id="' + escapeHtml(player.id) + '">' +
          '<td><div class="user">' + avatarMarkup(player) + '<div><div class="nickname">' + escapeHtml(player.nickname) + '</div><div class="small">玩家</div></div></div></td>' +
          '<td><span class="score">' + escapeHtml(player.solved) + '</span></td>' +
          '<td>' + escapeHtml(formatDate(player.updatedAt)) + '</td>' +
          '<td class="id">' + escapeHtml(player.id) + '</td>' +
          '<td><button class="ghost" data-action="select" data-id="' + escapeHtml(player.id) + '">管理</button></td>' +
          '</tr>';
      }).join('');
      els.playersBody.querySelectorAll('[data-action="select"]').forEach(function (button) {
        button.addEventListener('click', function () {
          setSelectedPlayer(button.dataset.id);
        });
      });
      els.playersBody.querySelectorAll('tr[data-id]').forEach(function (row) {
        row.addEventListener('dblclick', function () {
          setSelectedPlayer(row.dataset.id);
        });
      });
    }

    function loadImage(file) {
      return new Promise(function (resolve, reject) {
        const imageUrl = URL.createObjectURL(file);
        const image = new Image();
        image.onload = function () {
          URL.revokeObjectURL(imageUrl);
          resolve(image);
        };
        image.onerror = function () {
          URL.revokeObjectURL(imageUrl);
          reject(new Error('头像图片读取失败，请换一张图片。'));
        };
        image.src = imageUrl;
      });
    }

    async function resizeAvatarFile(file) {
      if (!file || !file.type || !file.type.startsWith('image/')) {
        throw new Error('请选择 jpg、png 或 webp 图片。');
      }
      const image = await loadImage(file);
      const sourceSide = Math.min(image.naturalWidth, image.naturalHeight);
      const sourceX = Math.floor((image.naturalWidth - sourceSide) / 2);
      const sourceY = Math.floor((image.naturalHeight - sourceSide) / 2);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('当前浏览器不支持头像压缩。');

      const sizes = [160, 128, 96, 72, 56];
      const qualities = [0.82, 0.72, 0.62, 0.52, 0.42];
      let smallest = '';
      for (const size of sizes) {
        canvas.width = size;
        canvas.height = size;
        context.clearRect(0, 0, size, size);
        context.drawImage(image, sourceX, sourceY, sourceSide, sourceSide, 0, 0, size, size);
        for (const quality of qualities) {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          smallest = dataUrl;
          if (dataUrl.length <= MAX_AVATAR_DATA_URL_LENGTH) return dataUrl;
        }
      }
      throw new Error('这张头像压缩后仍然太大，请换一张更简单的图片。当前最小长度：' + smallest.length);
    }

    async function handleAvatarFileChange(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      setMessage('正在压缩头像……');
      try {
        state.pendingAvatarData = await resizeAvatarFile(file);
        state.pendingAvatarRemoval = false;
        const removeAvatar = document.getElementById('removeAvatar');
        if (removeAvatar) removeAvatar.checked = false;
        setMessage('头像已载入预览，点“保存修改”后才会写入排行榜。', 'ok');
        render();
      } catch (error) {
        state.pendingAvatarData = '';
        state.pendingAvatarRemoval = false;
        setMessage(error.message, 'bad');
        event.target.value = '';
      }
    }

    function renderDetail() {
      const player = selectedPlayer();
      if (!player) {
        els.detailPanel.innerHTML = '<div class="empty">选择一个用户后，可以编辑昵称/题数，或删除该用户。删除和编辑前后端会自动创建备份。</div>';
        return;
      }
      els.detailPanel.innerHTML =
        '<h2>管理用户</h2>' +
        '<div class="user" style="margin-bottom:16px">' + avatarMarkup(player) + '<div><div class="nickname">' + escapeHtml(player.nickname) + '</div><div class="id">' + escapeHtml(player.id) + '</div></div></div>' +
        '<div class="field"><label for="editNickname">昵称</label><input id="editNickname" maxlength="30" value="' + escapeHtml(player.nickname) + '"></div>' +
        '<div class="field"><label for="editSolved">完成题数</label><input id="editSolved" type="number" min="0" max="10000000" step="1" value="' + escapeHtml(player.solved) + '"></div>' +
        '<div class="avatar-editor">' +
          avatarPreviewMarkup(player) +
          '<div class="avatar-tools">' +
            '<label for="avatarFile">头像</label>' +
            '<input class="file-input" id="avatarFile" type="file" accept="image/png,image/jpeg,image/webp">' +
            '<div class="actions">' +
              '<button class="ghost" id="discardAvatarButton" type="button">丢弃新头像</button>' +
            '</div>' +
            '<div class="avatar-note">可直接上传新头像；保存时会同步到排行榜。图片会在本地自动裁剪压缩。</div>' +
          '</div>' +
        '</div>' +
        '<div class="field token-row"><input id="removeAvatar" type="checkbox"' + (state.pendingAvatarRemoval ? ' checked' : '') + '><span class="small">保存时清除当前头像</span></div>' +
        '<div class="side-actions">' +
          '<button class="primary" id="savePlayerButton">保存修改</button>' +
          '<button class="ghost" id="copyIdButton">复制玩家 ID</button>' +
          '<button class="danger" id="deletePlayerButton">删除这个用户</button>' +
        '</div>' +
        '<p class="small">编辑/删除会自动创建 before-edit 或 before-delete 备份文件。</p>';
      document.getElementById('savePlayerButton').addEventListener('click', saveSelectedPlayer);
      document.getElementById('avatarFile').addEventListener('change', handleAvatarFileChange);
      document.getElementById('discardAvatarButton').addEventListener('click', function () {
        state.pendingAvatarData = '';
        state.pendingAvatarRemoval = false;
        const removeAvatar = document.getElementById('removeAvatar');
        if (removeAvatar) removeAvatar.checked = false;
        setMessage('已丢弃未保存的新头像。');
        render();
      });
      document.getElementById('removeAvatar').addEventListener('change', function (event) {
        state.pendingAvatarRemoval = event.target.checked;
        if (state.pendingAvatarRemoval) state.pendingAvatarData = '';
        render();
      });
      document.getElementById('deletePlayerButton').addEventListener('click', deleteSelectedPlayer);
      document.getElementById('copyIdButton').addEventListener('click', function () {
        navigator.clipboard.writeText(player.id).then(function () {
          setMessage('已复制玩家 ID。', 'ok');
        }).catch(function () {
          setMessage('复制失败，可以手动选中 ID 复制。', 'bad');
        });
      });
    }

    function render() {
      renderStatus();
      renderPlayers();
      renderDetail();
    }

    async function refreshAll() {
      setBusy(true);
      setMessage('正在连接后端……');
      try {
        saveSettings();
        state.status = await proxy('/api/status');
        try {
          state.ready = await proxy('/ready');
        } catch {
          state.ready = null;
        }
        try {
          state.document = await proxy('/api/admin/export', { admin: true });
          state.loadedFromAdmin = true;
          setMessage('已通过管理接口读取最新用户数据。', 'ok');
        } catch (adminError) {
          state.document = await proxy('/api/leaderboard');
          state.loadedFromAdmin = false;
          const suffix = settings().token ? ' 管理接口暂不可用：' + adminError.message : ' 填写 ADMIN_TOKEN 后可编辑用户。';
          setMessage('已读取公开榜单。' + suffix, settings().token ? 'bad' : '');
        }
        render();
      } catch (error) {
        state.status = null;
        render();
        setMessage(error.message, 'bad');
      } finally {
        setBusy(false);
      }
    }

    async function createBackup() {
      setBusy(true);
      setMessage('正在创建备份……');
      try {
        const result = await proxy('/api/admin/backup', { method: 'POST', admin: true });
        setMessage('备份成功：' + result.fileName, 'ok');
        await refreshAll();
      } catch (error) {
        setMessage(error.message, 'bad');
      } finally {
        setBusy(false);
      }
    }

    async function saveSelectedPlayer() {
      const player = selectedPlayer();
      if (!player) return;
      const nickname = document.getElementById('editNickname').value.trim();
      const solved = Number.parseInt(document.getElementById('editSolved').value, 10);
      const removeAvatar = state.pendingAvatarRemoval;
      if (!nickname) {
        setMessage('昵称不能为空。', 'bad');
        return;
      }
      if (!Number.isSafeInteger(solved) || solved < 0) {
        setMessage('完成题数必须是非负整数。', 'bad');
        return;
      }
      const patch = { nickname: nickname, solved: solved };
      if (removeAvatar) patch.avatar = null;
      else if (state.pendingAvatarData) patch.avatar = state.pendingAvatarData;
      setBusy(true);
      setMessage('正在保存用户修改……');
      try {
        state.document = await proxy('/api/admin/players/' + encodeURIComponent(player.id), {
          method: 'PATCH',
          admin: true,
          body: patch
        });
        state.pendingAvatarData = '';
        state.pendingAvatarRemoval = false;
        state.loadedFromAdmin = true;
        setMessage('用户已更新，并已自动备份。', 'ok');
        render();
      } catch (error) {
        setMessage(error.message, 'bad');
      } finally {
        setBusy(false);
      }
    }

    async function deleteSelectedPlayer() {
      const player = selectedPlayer();
      if (!player) return;
      if (!confirm('确认删除用户“' + player.nickname + '”？后端会先自动备份。')) return;
      setBusy(true);
      setMessage('正在删除用户……');
      try {
        state.document = await proxy('/api/admin/players/' + encodeURIComponent(player.id), {
          method: 'DELETE',
          admin: true
        });
        state.selectedId = '';
        state.pendingAvatarData = '';
        state.pendingAvatarRemoval = false;
        state.loadedFromAdmin = true;
        setMessage('用户已删除，并已自动备份。', 'ok');
        render();
      } catch (error) {
        setMessage(error.message, 'bad');
      } finally {
        setBusy(false);
      }
    }

    async function listBackups() {
      setBusy(true);
      setMessage('正在读取备份列表……');
      try {
        const result = await proxy('/api/admin/backups', { admin: true });
        const backups = result.backups || [];
        els.backupList.innerHTML = backups.length
          ? backups.slice().reverse().map(function (name) { return '<li>' + escapeHtml(name) + '</li>'; }).join('')
          : '<li>暂无备份文件。</li>';
        setMessage('已读取 ' + backups.length + ' 个备份文件。', 'ok');
      } catch (error) {
        setMessage(error.message, 'bad');
      } finally {
        setBusy(false);
      }
    }

    async function resetLeaderboard() {
      const first = confirm('确认要清空整个榜单吗？后端会先自动备份。');
      if (!first) return;
      const typed = prompt('输入 RESET 才会继续清空榜单。');
      if (typed !== 'RESET') {
        setMessage('已取消清空榜单。');
        return;
      }
      setBusy(true);
      setMessage('正在清空榜单……');
      try {
        state.document = await proxy('/api/admin/reset', { method: 'POST', admin: true });
        state.selectedId = '';
        state.pendingAvatarData = '';
        state.pendingAvatarRemoval = false;
        state.loadedFromAdmin = true;
        setMessage('榜单已清空，并已自动备份。', 'ok');
        render();
      } catch (error) {
        setMessage(error.message, 'bad');
      } finally {
        setBusy(false);
      }
    }

    function downloadJson() {
      if (!state.document) {
        setMessage('还没有可下载的数据，先刷新一次。', 'bad');
        return;
      }
      const blob = new Blob([JSON.stringify(state.document, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'why-leaderboard-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage('JSON 已开始下载。', 'ok');
    }

    function boot() {
      els.apiBase.value = localStorage.getItem('whyAdminApiBase') || DEFAULT_API_BASE;
      const rememberedToken = sessionStorage.getItem('whyAdminToken') || '';
      els.adminToken.value = rememberedToken;
      els.rememberToken.checked = Boolean(rememberedToken);
      els.refreshButton.addEventListener('click', refreshAll);
      els.backupButton.addEventListener('click', createBackup);
      els.downloadButton.addEventListener('click', downloadJson);
      els.backupsButton.addEventListener('click', listBackups);
      els.resetButton.addEventListener('click', resetLeaderboard);
      els.searchInput.addEventListener('input', renderPlayers);
      els.adminToken.addEventListener('input', saveSettings);
      els.apiBase.addEventListener('change', saveSettings);
      els.rememberToken.addEventListener('change', saveSettings);
      render();
    }

    boot();
  </script>
</body>
</html>`
}

export function createAdminHandler() {
  return async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    try {
      if (request.method === 'GET' && url.pathname === '/') {
        response.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Length': Buffer.byteLength(adminHtml()),
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'self'; form-action 'none'",
        })
        response.end(adminHtml())
        return
      }
      if (request.method === 'GET' && url.pathname === '/local-health') {
        sendJson(response, 200, { status: 'ok', defaultApiBase: DEFAULT_API_BASE })
        return
      }
      if (url.pathname === '/proxy') {
        await proxyRequest(request, response, url)
        return
      }
      sendJson(response, 404, { error: 'Not found' })
    } catch (error) {
      const status = Number.isInteger(error?.status) ? error.status : 502
      sendJson(response, status, {
        error: error instanceof Error ? error.message : 'Local admin proxy failed',
      })
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createServer(createAdminHandler())
  server.listen(DEFAULT_PORT, '127.0.0.1', () => {
    console.log(`WHY local admin console: http://127.0.0.1:${DEFAULT_PORT}`)
    console.log(`Default API base: ${DEFAULT_API_BASE}`)
  })
}
