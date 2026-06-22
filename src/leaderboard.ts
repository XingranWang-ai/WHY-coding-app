import { requestApiJson } from './network'

export type PlayerProfile = {
  id: string
  nickname: string
  avatar?: string
}

export type LeaderboardEntry = PlayerProfile & {
  solved: number
  updatedAt: string
}

export type PlayerAccount = {
  profile: PlayerProfile
  solved: number
}

type LeaderboardDocument = {
  version: 1
  players: LeaderboardEntry[]
  updatedAt: string
}

const PROFILE_KEY = 'why-player-profile-v1'
const SOLVED_KEY = 'why-solved-count-v1'
const ACCOUNTS_KEY = 'why-player-accounts-v2'
const CACHE_KEY = 'why-leaderboard-cache-v1'
const MAX_AVATAR_LENGTH = 9000
const AVATAR_PATTERN = /^data:image\/(?:jpeg|png|webp);base64,/i

function isAvatar(value: unknown) {
  return (
    value === undefined ||
    (typeof value === 'string' &&
      value.length <= MAX_AVATAR_LENGTH &&
      AVATAR_PATTERN.test(value))
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

function isAccount(value: unknown): value is PlayerAccount {
  if (!value || typeof value !== 'object') return false
  const account = value as Partial<PlayerAccount>
  return (
    isProfile(account.profile) &&
    typeof account.solved === 'number' &&
    Number.isFinite(account.solved) &&
    account.solved >= 0
  )
}

function writeAccounts(accounts: PlayerAccount[], activeId: string) {
  window.localStorage.setItem(
    ACCOUNTS_KEY,
    JSON.stringify({ version: 2, activeId, accounts }),
  )

  const active = accounts.find((account) => account.profile.id === activeId)
  if (active) {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(active.profile))
    window.localStorage.setItem(SOLVED_KEY, String(active.solved))
  }
}

function readAccounts(): { accounts: PlayerAccount[]; activeId: string } {
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as {
        accounts?: unknown
        activeId?: unknown
      }
      const accounts = Array.isArray(parsed.accounts)
        ? parsed.accounts.filter(isAccount)
        : []
      if (accounts.length > 0) {
        const activeId =
          typeof parsed.activeId === 'string' &&
          accounts.some((account) => account.profile.id === parsed.activeId)
            ? parsed.activeId
            : accounts[0].profile.id
        return { accounts, activeId }
      }
    }

    const legacyRaw = window.localStorage.getItem(PROFILE_KEY)
    if (!legacyRaw) return { accounts: [], activeId: '' }
    const legacyProfile: unknown = JSON.parse(legacyRaw)
    if (!isProfile(legacyProfile)) return { accounts: [], activeId: '' }
    const legacySolved = Number.parseInt(
      window.localStorage.getItem(SOLVED_KEY) ?? '0',
      10,
    )
    const accounts = [{
      profile: legacyProfile,
      solved: Number.isFinite(legacySolved) && legacySolved > 0 ? legacySolved : 0,
    }]
    writeAccounts(accounts, legacyProfile.id)
    return { accounts, activeId: legacyProfile.id }
  } catch {
    return { accounts: [], activeId: '' }
  }
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

export function loadProfile(): PlayerProfile | null {
  const { accounts, activeId } = readAccounts()
  return accounts.find((account) => account.profile.id === activeId)?.profile ?? null
}

export function loadAccounts(): PlayerAccount[] {
  return readAccounts().accounts
}

export function saveProfile(profile: PlayerProfile) {
  const { accounts } = readAccounts()
  const existingIndex = accounts.findIndex(
    (account) => account.profile.id === profile.id,
  )
  const nextAccounts = [...accounts]
  if (existingIndex >= 0) {
    nextAccounts[existingIndex] = { ...nextAccounts[existingIndex], profile }
  } else {
    nextAccounts.push({ profile, solved: 0 })
  }
  writeAccounts(nextAccounts, profile.id)
}

export function activateProfile(profileId: string): PlayerProfile | null {
  const { accounts } = readAccounts()
  const account = accounts.find((item) => item.profile.id === profileId)
  if (!account) return null
  writeAccounts(accounts, profileId)
  return account.profile
}

export function createProfile(nickname: string): PlayerProfile {
  return { id: crypto.randomUUID(), nickname: nickname.trim() }
}

export function loadSolvedCount(profileId?: string) {
  const { accounts, activeId } = readAccounts()
  const selectedId = profileId ?? activeId
  return accounts.find((account) => account.profile.id === selectedId)?.solved ?? 0
}

export function incrementSolvedCount(profileId?: string) {
  const { accounts, activeId } = readAccounts()
  const selectedId = profileId ?? activeId
  const accountIndex = accounts.findIndex(
    (account) => account.profile.id === selectedId,
  )
  if (accountIndex < 0) return 0

  const next = accounts[accountIndex].solved + 1
  const nextAccounts = [...accounts]
  nextAccounts[accountIndex] = { ...nextAccounts[accountIndex], solved: next }
  writeAccounts(nextAccounts, activeId)
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
  const document = normalizeDocument(
    await requestApiJson<LeaderboardDocument>('/api/leaderboard'),
  )
  const players = sortLeaderboard(document.players)
  cacheLeaderboard(players)
  return players
}

export async function syncPlayer(profile: PlayerProfile, solved: number) {
  const document = normalizeDocument(
    await requestApiJson<LeaderboardDocument>('/api/players/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, solved }),
    }),
  )
  const players = sortLeaderboard(document.players)
  cacheLeaderboard(players)
  return players
}
