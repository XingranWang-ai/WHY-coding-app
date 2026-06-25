import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'

const FILE_NAME = 'leaderboard.json'
const BACKUP_PREFIX = 'leaderboard-backup-'
const MAX_PLAYERS = 200
const MAX_AVATAR_LENGTH = 9_000
const MAX_BODY_BYTES = 32_000
const MAX_IMPORT_BODY_BYTES = 1_200_000
const AVATAR_PATTERN = /^data:image\/(?:jpeg|png|webp);base64,/i
const DEFAULT_ALLOWED_ORIGINS = [
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
]

function emptyDocument(now = new Date().toISOString()) {
  return { version: 1, players: [], updatedAt: now }
}

function backupFileName(reason, nowString) {
  const stamp = nowString.replace(/[:.]/g, '-').replace(/[^0-9TZ-]/g, '')
  const cleanReason = String(reason || 'manual')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'manual'
  return `${BACKUP_PREFIX}${stamp}-${cleanReason}.json`
}

function isAvatar(value) {
  return value === undefined || (
    typeof value === 'string' &&
    value.length <= MAX_AVATAR_LENGTH &&
    AVATAR_PATTERN.test(value)
  )
}

function isPlayerId(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 80
}

function importPlayerIdForNickname(nickname) {
  const hash = createHash('sha256')
    .update(nickname.trim().toLowerCase())
    .digest('hex')
    .slice(0, 24)
  return `import-${hash}`
}

function cleanPlayer(value) {
  if (!value || typeof value !== 'object') return null
  if (
    typeof value.id !== 'string' ||
    value.id.length < 8 ||
    value.id.length > 80 ||
    typeof value.nickname !== 'string' ||
    value.nickname.trim().length < 1 ||
    value.nickname.trim().length > 30 ||
    !isAvatar(value.avatar) ||
    !Number.isSafeInteger(value.solved) ||
    value.solved < 0 ||
    value.solved > 10_000_000 ||
    typeof value.updatedAt !== 'string'
  ) {
    return null
  }
  return {
    id: value.id,
    nickname: value.nickname.trim(),
    ...(value.avatar ? { avatar: value.avatar } : {}),
    solved: value.solved,
    updatedAt: value.updatedAt,
  }
}

export function normalizeDocument(value, now = new Date().toISOString()) {
  const players = Array.isArray(value?.players)
    ? value.players.map(cleanPlayer).filter(Boolean).slice(-MAX_PLAYERS)
    : []
  return {
    version: 1,
    players,
    updatedAt: typeof value?.updatedAt === 'string' ? value.updatedAt : now,
  }
}

export function validateSyncPayload(value) {
  if (!value || typeof value !== 'object' || !value.profile) return null
  const solved = value.solved
  const profile = value.profile
  if (
    typeof profile.id !== 'string' ||
    profile.id.length < 8 ||
    profile.id.length > 80 ||
    typeof profile.nickname !== 'string' ||
    profile.nickname.trim().length < 1 ||
    profile.nickname.trim().length > 30 ||
    !isAvatar(profile.avatar) ||
    !Number.isSafeInteger(solved) ||
    solved < 0 ||
    solved > 10_000_000
  ) {
    return null
  }
  return {
    profile: {
      id: profile.id,
      nickname: profile.nickname.trim(),
      ...(profile.avatar ? { avatar: profile.avatar } : {}),
    },
    solved,
  }
}

export function validateAdminPlayerPatch(value) {
  if (!value || typeof value !== 'object') return null
  const patch = {}

  if ('nickname' in value) {
    if (
      typeof value.nickname !== 'string' ||
      value.nickname.trim().length < 1 ||
      value.nickname.trim().length > 30
    ) {
      return null
    }
    patch.nickname = value.nickname.trim()
  }

  if ('solved' in value) {
    if (
      !Number.isSafeInteger(value.solved) ||
      value.solved < 0 ||
      value.solved > 10_000_000
    ) {
      return null
    }
    patch.solved = value.solved
  }

  if ('avatar' in value) {
    if (value.avatar === null || value.avatar === '') {
      patch.avatar = null
    } else if (isAvatar(value.avatar)) {
      patch.avatar = value.avatar
    } else {
      return null
    }
  }

  return Object.keys(patch).length > 0 ? patch : null
}

function cleanImportPlayer(value) {
  if (!value || typeof value !== 'object') return null
  const nickname = value.nickname ?? value.name
  if (
    (value.id !== undefined && !isPlayerId(value.id)) ||
    typeof nickname !== 'string' ||
    nickname.trim().length < 1 ||
    nickname.trim().length > 30 ||
    !Number.isSafeInteger(value.solved) ||
    value.solved < 0 ||
    value.solved > 10_000_000
  ) {
    return null
  }

  const player = {
    ...(value.id ? { id: value.id } : {}),
    nickname: nickname.trim(),
    solved: value.solved,
  }
  if ('avatar' in value) {
    if (value.avatar === null || value.avatar === '') {
      player.avatar = null
    } else if (isAvatar(value.avatar)) {
      player.avatar = value.avatar
    } else {
      return null
    }
  }
  return player
}

export function validateAdminImportPayload(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.players)) return null
  if (value.players.length < 1 || value.players.length > MAX_PLAYERS) return null
  const players = value.players.map(cleanImportPlayer)
  if (players.some((player) => !player)) return null
  return players
}

export function mergeImportedPlayers(documentValue, importPlayers, now = new Date().toISOString()) {
  const document = normalizeDocument(documentValue, now)
  const players = [...document.players]
  let created = 0
  let updated = 0

  for (const importPlayer of importPlayers) {
    const existingIndex = importPlayer.id
      ? players.findIndex((player) => player.id === importPlayer.id)
      : players.findIndex((player) => player.nickname === importPlayer.nickname)
    const existing = existingIndex >= 0 ? players[existingIndex] : null
    const nextPlayer = {
      ...(existing ?? {}),
      id: existing?.id ?? importPlayer.id ?? importPlayerIdForNickname(importPlayer.nickname),
      nickname: importPlayer.nickname,
      solved: importPlayer.solved,
      updatedAt: now,
    }
    if ('avatar' in importPlayer) {
      if (importPlayer.avatar === null) delete nextPlayer.avatar
      else nextPlayer.avatar = importPlayer.avatar
    }

    if (existingIndex >= 0) {
      players[existingIndex] = nextPlayer
      updated += 1
    } else {
      players.push(nextPlayer)
      created += 1
    }
  }

  const next = {
    version: 1,
    players: players.slice(-MAX_PLAYERS),
    updatedAt: now,
  }
  return {
    document: next,
    imported: {
      total: importPlayers.length,
      created,
      updated,
    },
  }
}

export function mergePlayer(documentValue, payload, now = new Date().toISOString()) {
  const document = normalizeDocument(documentValue, now)
  const existingIndex = document.players.findIndex(
    (player) => player.id === payload.profile.id,
  )
  const nextPlayer = {
    ...payload.profile,
    solved: Math.max(payload.solved, document.players[existingIndex]?.solved ?? 0),
    updatedAt: now,
  }
  const players = [...document.players]
  if (existingIndex >= 0) players[existingIndex] = nextPlayer
  else players.push(nextPlayer)
  return { version: 1, players: players.slice(-MAX_PLAYERS), updatedAt: now }
}

export function needsPlayerUpdate(documentValue, payload) {
  const document = normalizeDocument(documentValue)
  const existing = document.players.find((player) => player.id === payload.profile.id)
  if (!existing) return true
  return (
    existing.nickname !== payload.profile.nickname ||
    (existing.avatar ?? '') !== (payload.profile.avatar ?? '') ||
    existing.solved < payload.solved
  )
}

async function fetchWithRetry(url, init, attempts = 3) {
  let lastError
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8_000)
    try {
      const response = await fetch(url, { ...init, signal: controller.signal })
      if (response.status < 500 && response.status !== 429) return response
      lastError = new Error(`GitHub request failed: ${response.status}`)
    } catch (error) {
      lastError = error
    } finally {
      clearTimeout(timeout)
    }
    await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** attempt)))
  }
  throw lastError ?? new Error('GitHub request failed')
}

export class GitHubGistStore {
  constructor({ token, gistId }) {
    if (!token || !gistId) throw new Error('GITHUB_TOKEN and LEADERBOARD_GIST_ID are required')
    this.token = token
    this.gistId = gistId
    this.cache = null
    this.writeQueue = Promise.resolve()
  }

  headers(extra = {}) {
    return {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${this.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'why-sync-api',
      ...extra,
    }
  }

  documentFromUpdatedGist(gist) {
    const content = gist.files?.[FILE_NAME]?.content
    if (typeof content !== 'string') {
      throw new Error('GitHub did not return the leaderboard file')
    }
    return normalizeDocument(JSON.parse(content))
  }

  async patchFiles(files) {
    const response = await fetchWithRetry(
      `https://api.github.com/gists/${this.gistId}`,
      {
        method: 'PATCH',
        headers: this.headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ files }),
      },
    )
    if (!response.ok) throw new Error(`Unable to update leaderboard store: ${response.status}`)
    return response.json()
  }

  async withWriteLock(operation) {
    const result = this.writeQueue.then(operation, operation)
    this.writeQueue = result.catch(() => undefined)
    return result
  }

  async read({ fresh = false } = {}) {
    if (!fresh && this.cache && Date.now() - this.cache.savedAt < 15_000) {
      return this.cache.document
    }
    const response = await fetchWithRetry(
      `https://api.github.com/gists/${this.gistId}`,
      { headers: this.headers() },
    )
    if (!response.ok) throw new Error(`Unable to read leaderboard store: ${response.status}`)
    const gist = await response.json()
    const file = gist.files?.[FILE_NAME]
    if (!file) throw new Error(`Gist is missing ${FILE_NAME}`)
    let content = file.content
    if (file.truncated && file.raw_url) {
      const raw = await fetchWithRetry(file.raw_url, { headers: this.headers() })
      if (!raw.ok) throw new Error(`Unable to read complete leaderboard: ${raw.status}`)
      content = await raw.text()
    }
    const document = normalizeDocument(JSON.parse(content))
    this.cache = {
      document,
      savedAt: Date.now(),
    }
    return document
  }

  async syncPlayer(payload, now) {
    return this.withWriteLock(async () => {
      const current = await this.read()
      if (!needsPlayerUpdate(current, payload)) return current
      const next = mergePlayer(current, payload, now())
      const updatedGist = await this.patchFiles({
        [FILE_NAME]: { content: JSON.stringify(next) },
      })
      const persisted = this.documentFromUpdatedGist(updatedGist)
      const savedPlayer = persisted.players.find(
        (player) => player.id === payload.profile.id,
      )
      if (!savedPlayer || savedPlayer.solved < payload.solved) {
        throw new Error('GitHub returned stale leaderboard data after update')
      }
      this.cache = { document: persisted, savedAt: Date.now() }
      return persisted
    })
  }

  async backup(reason, now) {
    return this.withWriteLock(async () => {
      const current = await this.read({ fresh: true })
      const fileName = backupFileName(reason, now())
      await this.patchFiles({ [fileName]: { content: JSON.stringify(current) } })
      return { fileName, players: current.players.length, updatedAt: current.updatedAt }
    })
  }

  async listBackups() {
    const response = await fetchWithRetry(
      `https://api.github.com/gists/${this.gistId}`,
      { headers: this.headers() },
    )
    if (!response.ok) throw new Error(`Unable to list backups: ${response.status}`)
    const gist = await response.json()
    return Object.keys(gist.files ?? {})
      .filter((name) => name.startsWith(BACKUP_PREFIX))
      .sort()
  }

  async removePlayer(playerId, now) {
    return this.withWriteLock(async () => {
      const current = await this.read()
      const nextPlayers = current.players.filter((player) => player.id !== playerId)
      if (nextPlayers.length === current.players.length) return current
      const nowString = now()
      const next = { version: 1, players: nextPlayers, updatedAt: nowString }
      const updatedGist = await this.patchFiles({
        [backupFileName('before-delete', nowString)]: { content: JSON.stringify(current) },
        [FILE_NAME]: { content: JSON.stringify(next) },
      })
      const persisted = this.documentFromUpdatedGist(updatedGist)
      this.cache = { document: persisted, savedAt: Date.now() }
      return persisted
    })
  }

  async updatePlayer(playerId, patch, now) {
    return this.withWriteLock(async () => {
      const current = await this.read({ fresh: true })
      const playerIndex = current.players.findIndex((player) => player.id === playerId)
      if (playerIndex < 0) {
        const error = new Error('Player not found')
        error.status = 404
        throw error
      }
      const nowString = now()
      const nextPlayer = {
        ...current.players[playerIndex],
        ...patch,
        updatedAt: nowString,
      }
      if (patch.avatar === null) delete nextPlayer.avatar

      const players = [...current.players]
      players[playerIndex] = nextPlayer
      const next = { version: 1, players, updatedAt: nowString }
      const updatedGist = await this.patchFiles({
        [backupFileName('before-edit', nowString)]: { content: JSON.stringify(current) },
        [FILE_NAME]: { content: JSON.stringify(next) },
      })
      const persisted = this.documentFromUpdatedGist(updatedGist)
      this.cache = { document: persisted, savedAt: Date.now() }
      return persisted
    })
  }

  async importPlayers(importPlayers, now) {
    return this.withWriteLock(async () => {
      const current = await this.read({ fresh: true })
      const nowString = now()
      const next = mergeImportedPlayers(current, importPlayers, nowString)
      const updatedGist = await this.patchFiles({
        [backupFileName('before-import', nowString)]: { content: JSON.stringify(current) },
        [FILE_NAME]: { content: JSON.stringify(next.document) },
      })
      const persisted = this.documentFromUpdatedGist(updatedGist)
      this.cache = { document: persisted, savedAt: Date.now() }
      return { document: persisted, imported: next.imported }
    })
  }

  async reset(now) {
    return this.withWriteLock(async () => {
      const current = await this.read()
      const nowString = now()
      const next = emptyDocument(nowString)
      const updatedGist = await this.patchFiles({
        [backupFileName('before-reset', nowString)]: { content: JSON.stringify(current) },
        [FILE_NAME]: { content: JSON.stringify(next) },
      })
      const persisted = this.documentFromUpdatedGist(updatedGist)
      this.cache = { document: persisted, savedAt: Date.now() }
      return persisted
    })
  }
}

function sendJson(response, status, value, extraHeaders = {}) {
  const body = JSON.stringify(value)
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  })
  response.end(body)
}

async function readJsonBody(request, maxBytes = MAX_BODY_BYTES) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > maxBytes) {
      const error = new Error('Request body is too large')
      error.status = 413
      throw error
    }
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    const error = new Error('Request body must be valid JSON')
    error.status = 400
    throw error
  }
}

function createRateLimiter(limit = 120, windowMs = 60_000) {
  const clients = new Map()
  return (key) => {
    const now = Date.now()
    const current = clients.get(key)
    if (!current || current.resetAt <= now) {
      clients.set(key, { count: 1, resetAt: now + windowMs })
      return true
    }
    current.count += 1
    return current.count <= limit
  }
}

function requestId(request) {
  return createHash('sha256')
    .update(String(request.headers['x-forwarded-for'] ?? request.socket.remoteAddress ?? 'unknown'))
    .digest('hex')
    .slice(0, 16)
}

function isAdminRequest(request, adminToken) {
  if (!adminToken) return false
  const headerToken = request.headers['x-admin-token']
  const auth = request.headers.authorization
  const bearer = typeof auth === 'string' && auth.startsWith('Bearer ')
    ? auth.slice('Bearer '.length)
    : ''
  return headerToken === adminToken || bearer === adminToken
}

function adminDisabled(response, corsHeaders) {
  sendJson(response, 503, { error: 'Admin API is not configured' }, corsHeaders)
}

function adminForbidden(response, corsHeaders) {
  sendJson(response, 403, { error: 'Admin token is required' }, corsHeaders)
}

export function createHandler({
  store,
  now = () => new Date().toISOString(),
  allowedOrigins = DEFAULT_ALLOWED_ORIGINS,
  versionInfo,
  adminToken = '',
  rateLimit = 120,
}) {
  const allowRequest = createRateLimiter(rateLimit)
  const originSet = new Set(allowedOrigins)

  return async (request, response) => {
    const origin = request.headers.origin
    const corsHeaders = {
      Vary: 'Origin',
      ...(origin && originSet.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    }
    if (origin && !originSet.has(origin)) {
      sendJson(response, 403, { error: 'Origin is not allowed' }, corsHeaders)
      return
    }
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token, Authorization',
        'Access-Control-Max-Age': '86400',
      })
      response.end()
      return
    }

    const url = new URL(request.url ?? '/', 'http://localhost')
    if (request.method === 'GET' && url.pathname === '/health') {
      sendJson(response, 200, { status: 'ok' }, corsHeaders)
      return
    }
    if (!allowRequest(requestId(request))) {
      sendJson(response, 429, { error: 'Too many requests' }, {
        ...corsHeaders,
        'Retry-After': '60',
      })
      return
    }

    try {
      if (request.method === 'GET' && url.pathname === '/ready') {
        const document = await store.read({ fresh: true })
        sendJson(response, 200, {
          status: 'ready',
          players: document.players.length,
          updatedAt: document.updatedAt,
        }, corsHeaders)
        return
      }
      if (request.method === 'GET' && url.pathname === '/api/status') {
        sendJson(response, 200, {
          status: 'ok',
          service: 'why-sync-api',
          version: versionInfo.version,
          versionCode: versionInfo.versionCode,
          uptimeSeconds: Math.floor(process.uptime()),
          adminEnabled: Boolean(adminToken),
          maxPlayers: MAX_PLAYERS,
          endpoints: [
            'GET /health',
            'GET /ready',
            'GET /api/status',
            'GET /api/version',
            'GET /api/leaderboard',
            'POST /api/players/sync',
            'GET /api/admin/export',
            'POST /api/admin/backup',
            'GET /api/admin/backups',
            'POST /api/admin/import',
            'PATCH /api/admin/players/{playerId}',
            'DELETE /api/admin/players/{playerId}',
            'POST /api/admin/reset',
          ],
        }, corsHeaders)
        return
      }
      if (request.method === 'GET' && url.pathname === '/api/leaderboard') {
        sendJson(response, 200, await store.read(), corsHeaders)
        return
      }
      if (request.method === 'POST' && url.pathname === '/api/players/sync') {
        const payload = validateSyncPayload(await readJsonBody(request))
        if (!payload) {
          sendJson(response, 400, { error: 'Invalid player payload' }, corsHeaders)
          return
        }
        sendJson(response, 200, await store.syncPlayer(payload, now), corsHeaders)
        return
      }
      if (request.method === 'GET' && url.pathname === '/api/version') {
        sendJson(response, 200, versionInfo, corsHeaders)
        return
      }
      if (url.pathname.startsWith('/api/admin/')) {
        if (!adminToken) {
          adminDisabled(response, corsHeaders)
          return
        }
        if (!isAdminRequest(request, adminToken)) {
          adminForbidden(response, corsHeaders)
          return
        }
        if (request.method === 'GET' && url.pathname === '/api/admin/export') {
          sendJson(response, 200, await store.read({ fresh: true }), corsHeaders)
          return
        }
        if (request.method === 'GET' && url.pathname === '/api/admin/backups') {
          sendJson(response, 200, { backups: await store.listBackups() }, corsHeaders)
          return
        }
        if (request.method === 'POST' && url.pathname === '/api/admin/backup') {
          sendJson(response, 200, await store.backup('manual', now), corsHeaders)
          return
        }
        if (request.method === 'POST' && url.pathname === '/api/admin/import') {
          const importPlayers = validateAdminImportPayload(
            await readJsonBody(request, MAX_IMPORT_BODY_BYTES),
          )
          if (!importPlayers) {
            sendJson(response, 400, { error: 'Invalid import payload' }, corsHeaders)
            return
          }
          sendJson(response, 200, await store.importPlayers(importPlayers, now), corsHeaders)
          return
        }
        if (request.method === 'POST' && url.pathname === '/api/admin/reset') {
          sendJson(response, 200, await store.reset(now), corsHeaders)
          return
        }
        const playerMatch = url.pathname.match(/^\/api\/admin\/players\/([^/]+)$/)
        if (request.method === 'PATCH' && playerMatch) {
          const patch = validateAdminPlayerPatch(await readJsonBody(request))
          if (!patch) {
            sendJson(response, 400, { error: 'Invalid player update payload' }, corsHeaders)
            return
          }
          sendJson(
            response,
            200,
            await store.updatePlayer(decodeURIComponent(playerMatch[1]), patch, now),
            corsHeaders,
          )
          return
        }
        if (request.method === 'DELETE' && playerMatch) {
          sendJson(
            response,
            200,
            await store.removePlayer(decodeURIComponent(playerMatch[1]), now),
            corsHeaders,
          )
          return
        }
      }
      sendJson(response, 404, { error: 'Not found' }, corsHeaders)
    } catch (error) {
      const status = Number.isInteger(error?.status) ? error.status : 503
      console.error(JSON.stringify({
        level: 'error',
        requestId: requestId(request),
        path: url.pathname,
        message: error instanceof Error ? error.message : 'Unknown error',
      }))
      sendJson(response, status, {
        error: status >= 500 ? 'Sync service is temporarily unavailable' : error.message,
      }, corsHeaders)
    }
  }
}

function versionInfoFromEnvironment() {
  return {
    version: process.env.APP_VERSION ?? '2.1.0',
    versionCode: Number.parseInt(process.env.APP_VERSION_CODE ?? '15', 10),
    apkUrl: process.env.APP_APK_URL ??
      'https://github.com/XingranWang-ai/WHY-coding-app/releases/download/v2.1.0/Why-v2.1.0-debug.apk',
    releaseNotes: process.env.APP_RELEASE_NOTES ??
      '修复联网同步故障，并增加自动重试、离线补传和动态容灾配置。',
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const store = new GitHubGistStore({
    token: process.env.GITHUB_TOKEN,
    gistId: process.env.LEADERBOARD_GIST_ID,
  })
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS.join(','))
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const server = createServer(createHandler({
    store,
    allowedOrigins,
    adminToken: process.env.ADMIN_TOKEN ?? '',
    versionInfo: versionInfoFromEnvironment(),
  }))
  const port = Number.parseInt(process.env.PORT ?? '8787', 10)
  server.listen(port, '0.0.0.0', () => {
    console.log(JSON.stringify({ level: 'info', message: 'why-sync-api started', port }))
  })
}
