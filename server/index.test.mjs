import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { after, before, test } from 'node:test'
import { createHandler, mergePlayer, needsPlayerUpdate } from './index.mjs'

class MemoryStore {
  constructor() {
    this.document = { version: 1, players: [], updatedAt: '2026-06-22T00:00:00.000Z' }
  }

  async read() {
    return this.document
  }

  async syncPlayer(payload, now) {
    this.document = mergePlayer(this.document, payload, now())
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
