const DEFAULT_API_BASE = 'https://why-sync-api-xingran.onrender.com'
const NETWORK_CONFIG_URL =
  'https://raw.githubusercontent.com/XingranWang-ai/WHY-coding-app/main/network-config.json'
const CONFIG_CACHE_KEY = 'why-network-config-v1'
const CONFIG_CACHE_TTL_MS = 6 * 60 * 60 * 1000
const REQUEST_TIMEOUT_MS = 12_000
const RETRY_DELAYS_MS = [500, 1_500, 3_500]

export type NetworkConfig = {
  schemaVersion: 1
  apiBases: string[]
  latestVersion?: unknown
}

export class NetworkError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'NetworkError'
    this.status = status
  }
}

let configRequest: Promise<NetworkConfig | null> | null = null

function normalizeApiBase(value: unknown) {
  if (typeof value !== 'string' || value.length > 300) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

function parseNetworkConfig(value: unknown): NetworkConfig | null {
  if (!value || typeof value !== 'object') return null
  const config = value as Partial<NetworkConfig>
  if (config.schemaVersion !== 1 || !Array.isArray(config.apiBases)) return null
  const apiBases = config.apiBases
    .map(normalizeApiBase)
    .filter((base): base is string => Boolean(base))
  if (apiBases.length === 0) return null
  return { schemaVersion: 1, apiBases, latestVersion: config.latestVersion }
}

function readCachedConfig() {
  try {
    const raw = window.localStorage.getItem(CONFIG_CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw) as { savedAt?: unknown; config?: unknown }
    if (
      typeof cached.savedAt !== 'number' ||
      Date.now() - cached.savedAt > CONFIG_CACHE_TTL_MS
    ) {
      return null
    }
    return parseNetworkConfig(cached.config)
  } catch {
    return null
  }
}

function cacheConfig(config: NetworkConfig) {
  try {
    window.localStorage.setItem(
      CONFIG_CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), config }),
    )
  } catch {
    // Caching is an optimization; sync can continue without localStorage.
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function getNetworkConfig(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = readCachedConfig()
    if (cached) return cached
  }
  if (configRequest) return configRequest

  configRequest = fetchWithTimeout(
    NETWORK_CONFIG_URL,
    { cache: 'no-store', headers: { Accept: 'application/json' } },
    4_500,
  )
    .then(async (response) => {
      if (!response.ok) return null
      const config = parseNetworkConfig(await response.json())
      if (config) cacheConfig(config)
      return config
    })
    .catch(() => null)
    .finally(() => {
      configRequest = null
    })
  return configRequest
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function shouldRetry(status?: number) {
  return status === undefined || status === 408 || status === 429 || status >= 500
}

function configuredApiBase() {
  return normalizeApiBase(import.meta.env.VITE_SYNC_API_URL) ?? DEFAULT_API_BASE
}

function unique(values: string[]) {
  return [...new Set(values)]
}

export async function requestApiJson<T>(path: string, init: RequestInit = {}) {
  if (import.meta.env.DEV) {
    const response = await fetchWithTimeout(`/sync-api${path}`, init)
    if (!response.ok) {
      throw new NetworkError(`API request failed: ${response.status}`, response.status)
    }
    return (await response.json()) as T
  }

  const cached = readCachedConfig()
  let apiBases = unique([configuredApiBase(), ...(cached?.apiBases ?? [])])
  let refreshedConfig = false
  let lastError: unknown = new NetworkError('No sync endpoint is available')

  while (true) {
    for (const base of apiBases) {
      for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
        try {
          const response = await fetchWithTimeout(`${base}${path}`, {
            ...init,
            cache: 'no-store',
            headers: { Accept: 'application/json', ...init.headers },
          })
          if (!response.ok) {
            const error = new NetworkError(
              `API request failed: ${response.status}`,
              response.status,
            )
            if (!shouldRetry(response.status)) throw error
            lastError = error
          } else {
            return (await response.json()) as T
          }
        } catch (error) {
          lastError = error
          if (error instanceof NetworkError && !shouldRetry(error.status)) break
        }

        if (attempt < RETRY_DELAYS_MS.length - 1) {
          await sleep(RETRY_DELAYS_MS[attempt] + Math.floor(Math.random() * 180))
        }
      }
    }

    if (refreshedConfig) break
    refreshedConfig = true
    const remote = await getNetworkConfig(true)
    apiBases = unique(remote?.apiBases ?? [])
    if (apiBases.length === 0) break
  }

  if (lastError instanceof Error) throw lastError
  throw new NetworkError('Unable to reach the sync service')
}
