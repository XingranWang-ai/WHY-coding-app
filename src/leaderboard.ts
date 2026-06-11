export type PlayerProfile = {
  id: string
  nickname: string
  avatar?: string
}

export type LeaderboardEntry = PlayerProfile & {
  solved: number
  updatedAt: string
}

type LeaderboardDocument = {
  version: 1
  players: LeaderboardEntry[]
  updatedAt: string
}

const PROFILE_KEY = 'why-player-profile-v1'
const SOLVED_KEY = 'why-solved-count-v1'
const CACHE_KEY = 'why-leaderboard-cache-v1'
const BLOB_ID = '019eb5a7-bb37-780c-b384-6060c0f5bf43'
const REMOTE_URL = `https://jsonblob.com/api/jsonBlob/${BLOB_ID}`
const API_URL = import.meta.env.DEV ? '/leaderboard-api' : REMOTE_URL
const MAX_RETRIES = 5
const MAX_AVATAR_LENGTH = 9000

function isAvatar(value: unknown) {
  return (
    value === undefined ||
    (typeof value === 'string' &&
      value.length <= MAX_AVATAR_LENGTH &&
      /^data:image\/(?:jpeg|png|webp);base64,/i.test(value))
  )
}

function isProfile(value: unknown): value is PlayerProfile {
  if (!value || typeof value !== 'object') return false
  const profile = value as Partial<PlayerProfile>
  return (
    typeof profile.id === 'string' &&
    profile.id.length > 0 &&
    typeof profile.nickname === 'string' &&
    profile.nickname.length > 0 &&
    isAvatar(profile.avatar)
  )
}

function normalizeDocument(value: unknown): LeaderboardDocument {
  const document = value as Partial<LeaderboardDocument> | null
  const players = Array.isArray(document?.players)
    ? document.players.filter((entry): entry is LeaderboardEntry => {
        if (!entry || typeof entry !== 'object') return false
        const player = entry as Partial<LeaderboardEntry>
        return (
          typeof player.id === 'string' &&
          typeof player.nickname === 'string' &&
          isAvatar(player.avatar) &&
          typeof player.solved === 'number' &&
          Number.isFinite(player.solved) &&
          typeof player.updatedAt === 'string'
        )
      })
    : []

  return {
    version: 1,
    players,
    updatedAt:
      typeof document?.updatedAt === 'string'
        ? document.updatedAt
        : new Date().toISOString(),
  }
}

function sortLeaderboard(players: LeaderboardEntry[]) {
  return [...players].sort((left, right) => {
    if (right.solved !== left.solved) return right.solved - left.solved
    return left.updatedAt.localeCompare(right.updatedAt)
  })
}

async function readRemote() {
  const response = await fetch(API_URL, {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`排行榜读取失败：${response.status}`)
  const etag = response.headers.get('etag')
  if (!etag) throw new Error('排行榜服务未返回版本标识')
  return {
    document: normalizeDocument(await response.json()),
    etag,
  }
}

async function writeRemote(document: LeaderboardDocument, etag: string) {
  const response = await fetch(API_URL, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'If-Match': etag,
    },
    body: JSON.stringify(document),
  })
  if (response.status === 412) return false
  if (!response.ok) throw new Error(`排行榜写入失败：${response.status}`)
  return true
}

export function loadProfile(): PlayerProfile | null {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isProfile(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveProfile(profile: PlayerProfile) {
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function createProfile(nickname: string): PlayerProfile {
  return {
    id: crypto.randomUUID(),
    nickname: nickname.trim(),
  }
}

export function loadSolvedCount() {
  const parsed = Number.parseInt(window.localStorage.getItem(SOLVED_KEY) ?? '0', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function incrementSolvedCount() {
  const next = loadSolvedCount() + 1
  window.localStorage.setItem(SOLVED_KEY, String(next))
  return next
}

export function loadCachedLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed)
      ? sortLeaderboard(normalizeDocument({ players: parsed }).players)
      : []
  } catch {
    return []
  }
}

function cacheLeaderboard(players: LeaderboardEntry[]) {
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(players))
}

export async function fetchLeaderboard() {
  const { document } = await readRemote()
  const players = sortLeaderboard(document.players)
  cacheLeaderboard(players)
  return players
}

export async function syncPlayer(profile: PlayerProfile, solved: number) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const { document, etag } = await readRemote()
    const now = new Date().toISOString()
    const existingIndex = document.players.findIndex(
      (player) => player.id === profile.id,
    )
    const nextEntry: LeaderboardEntry = {
      ...profile,
      solved: Math.max(solved, document.players[existingIndex]?.solved ?? 0),
      updatedAt: now,
    }
    const nextPlayers = [...document.players]
    if (existingIndex >= 0) nextPlayers[existingIndex] = nextEntry
    else nextPlayers.push(nextEntry)

    const nextDocument: LeaderboardDocument = {
      version: 1,
      players: nextPlayers.slice(-100),
      updatedAt: now,
    }
    if (await writeRemote(nextDocument, etag)) {
      const players = sortLeaderboard(nextDocument.players)
      cacheLeaderboard(players)
      return players
    }
  }
  throw new Error('排行榜同时更新人数较多，请稍后重试')
}
