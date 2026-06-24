import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { after, before, test } from 'node:test'
import { createHandler, mergePlayer, needsPlayerUpdate } from './index.mjs'

class MemoryStore {
  constructor() {
    this.document = { version: 1, players: [], updatedAt: '2026-06-22T00:00:00.000Z' }
    this.backups = []
  }

  async read() {
    return this.document
  }

  async syncPlayer(payload, now) {
    this.document = mergePlayer(this.document, payload, now())
    return this.document
  }

  async backup(reason, now) {
    const fileName = `backup-${reason}-${now()}.json`
    this.backups.push(fileName)
    return { fileName, players: this.document.players.length, updatedAt: this.document.updatedAt }
  }

  async listBackups() {
    return this.backups
  }

  async removePlayer(playerId, now) {
    await this.backup('before-delete', now)
    this.document = {
      version: 1,
      players: this.document.players.filter((player) => player.id !== playerId),
      updatedAt: now(),
    }
    return this.document
  }

  async updatePlayer(playerId, patch, now) {
    await this.backup('before-edit', now)
    const playerIndex = this.document.players.findIndex((player) => player.id === playerId)
    if (playerIndex < 0) {
      const error = new Error('Player not found')
      error.status = 404
      throw error
    }
    const nextPlayer = {
      ...this.document.players[playerIndex],
      ...patch,
      updatedAt: now(),
    }
    if (patch.avatar === null) delete nextPlayer.avatar
    const players = [...this.document.players]
    players[playerIndex] = nextPlayer
    this.document = {
      version: 1,
      players,
      updatedAt: now(),
    }
    return this.document
  }

  async reset(now) {
    await this.backup('before-reset', now)
    this.document = { version: 1, players: [], updatedAt: now() }
    return this.document
  }
}

const store = new MemoryStore()
const server = createServer(createHandler({
  store,
  now: () => '2026-06-22T01:02:03.000Z',
  allowedOrigins: ['https://localhost'],
  versionInfo: {
    version: '2.1.0',
    versionCode: 15,
    apkUrl: 'https://example.com/why.apk',
    releaseNotes: 'Network fix',
  },
  adminToken: 'test-admin-token',
}))
let baseUrl

before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
})

test('health endpoint is available without touching the store', async () => {
  const response = await fetch(`${baseUrl}/health`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { status: 'ok' })
})

test('ready and status endpoints report backend state', async () => {
  const ready = await fetch(`${baseUrl}/ready`)
  assert.equal(ready.status, 200)
  assert.equal((await ready.json()).status, 'ready')

  const status = await fetch(`${baseUrl}/api/status`)
  assert.equal(status.status, 200)
  const body = await status.json()
  assert.equal(body.service, 'why-sync-api')
  assert.equal(body.adminEnabled, true)
})

test('sync merges a player and never decreases solved count', async () => {
  const profile = { id: 'player-12345678', nickname: 'Ada' }
  for (const solved of [7, 3]) {
    const response = await fetch(`${baseUrl}/api/players/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://localhost' },
      body: JSON.stringify({ profile, solved }),
    })
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://localhost')
  }
  const response = await fetch(`${baseUrl}/api/leaderboard`)
  const document = await response.json()
  assert.equal(document.players.length, 1)
  assert.equal(document.players[0].solved, 7)
  assert.equal(document.players[0].updatedAt, '2026-06-22T01:02:03.000Z')
})

test('unchanged progress does not require another persistent write', () => {
  const profile = { id: 'player-12345678', nickname: 'Ada' }
  assert.equal(needsPlayerUpdate(store.document, { profile, solved: 7 }), false)
  assert.equal(needsPlayerUpdate(store.document, { profile, solved: 8 }), true)
})

test('invalid payloads and untrusted origins are rejected', async () => {
  const invalid = await fetch(`${baseUrl}/api/players/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile: { id: 'short', nickname: '' }, solved: -1 }),
  })
  assert.equal(invalid.status, 400)

  const forbidden = await fetch(`${baseUrl}/api/leaderboard`, {
    headers: { Origin: 'https://attacker.example' },
  })
  assert.equal(forbidden.status, 403)
})

test('version metadata remains available if the leaderboard store is unavailable', async () => {
  const response = await fetch(`${baseUrl}/api/version`)
  assert.equal(response.status, 200)
  assert.equal((await response.json()).versionCode, 15)
})

test('admin endpoints require a token and can operate on the leaderboard', async () => {
  const unauthorized = await fetch(`${baseUrl}/api/admin/export`)
  assert.equal(unauthorized.status, 403)

  const headers = { 'X-Admin-Token': 'test-admin-token' }
  const exported = await fetch(`${baseUrl}/api/admin/export`, { headers })
  assert.equal(exported.status, 200)
  assert.equal((await exported.json()).players.length, 1)

  const updated = await fetch(`${baseUrl}/api/admin/players/player-12345678`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nickname: 'Grace',
      solved: 9,
      avatar: 'data:image/png;base64,iVBORw0KGgo=',
    }),
  })
  assert.equal(updated.status, 200)
  const updatedDocument = await updated.json()
  assert.equal(updatedDocument.players[0].nickname, 'Grace')
  assert.equal(updatedDocument.players[0].solved, 9)
  assert.equal(updatedDocument.players[0].avatar, 'data:image/png;base64,iVBORw0KGgo=')

  const backup = await fetch(`${baseUrl}/api/admin/backup`, { method: 'POST', headers })
  assert.equal(backup.status, 200)
  assert.match((await backup.json()).fileName, /^backup-manual-/)

  const backups = await fetch(`${baseUrl}/api/admin/backups`, { headers })
  assert.equal(backups.status, 200)
  assert.ok((await backups.json()).backups.length >= 1)

  const deleted = await fetch(`${baseUrl}/api/admin/players/player-12345678`, {
    method: 'DELETE',
    headers,
  })
  assert.equal(deleted.status, 200)
  assert.equal((await deleted.json()).players.length, 0)

  const reset = await fetch(`${baseUrl}/api/admin/reset`, { method: 'POST', headers })
  assert.equal(reset.status, 200)
  assert.equal((await reset.json()).players.length, 0)
})

test('admin endpoints are explicitly disabled when no admin token is configured', async () => {
  const localServer = createServer(createHandler({
    store: new MemoryStore(),
    now: () => '2026-06-22T01:02:03.000Z',
    allowedOrigins: ['https://localhost'],
    versionInfo: {
      version: '2.1.0',
      versionCode: 15,
      apkUrl: 'https://example.com/why.apk',
      releaseNotes: 'Network fix',
    },
  }))
  await new Promise((resolve) => localServer.listen(0, '127.0.0.1', resolve))
  try {
    const address = localServer.address()
    const response = await fetch(`http://127.0.0.1:${address.port}/api/admin/export`, {
      headers: { 'X-Admin-Token': 'anything' },
    })
    assert.equal(response.status, 503)
  } finally {
    await new Promise((resolve, reject) => localServer.close((error) => error ? reject(error) : resolve()))
  }
})
