import { getNetworkConfig, requestApiJson } from './network'

export const APP_VERSION = '2.1.0'
export const APP_VERSION_CODE = 15

export type UpdateInfo = {
  version: string
  versionCode: number
  apkUrl: string
  releaseNotes: string
}

function parseUpdateInfo(value: unknown): UpdateInfo | null {
  if (!value || typeof value !== 'object') return null
  const info = value as Partial<UpdateInfo>
  if (
    typeof info.version !== 'string' ||
    typeof info.versionCode !== 'number' ||
    typeof info.apkUrl !== 'string' ||
    typeof info.releaseNotes !== 'string'
  ) {
    return null
  }

  const releaseNotes = info.releaseNotes.trim()
  const hasBrokenText =
    releaseNotes.includes('\uFFFD') || /^[?\s]+$/.test(releaseNotes)

  return {
    version: info.version,
    versionCode: info.versionCode,
    apkUrl: info.apkUrl,
    releaseNotes: hasBrokenText ? '' : releaseNotes,
  }
}

export async function fetchLatestVersion(): Promise<UpdateInfo> {
  const config = await getNetworkConfig()
  const remoteValue =
    config?.latestVersion ?? await requestApiJson<unknown>('/api/version')
  const info = parseUpdateInfo(remoteValue)
  if (!info) throw new Error('版本信息格式错误')
  return info
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const info = await fetchLatestVersion()
    return info.versionCode > APP_VERSION_CODE ? info : null
  } catch {
    return null
  }
}

const SKIP_VERSION_KEY = 'why-skip-update-v1'

export function getSkippedVersion(): number {
  try {
    const raw = window.localStorage.getItem(SKIP_VERSION_KEY)
    return raw ? Number.parseInt(raw, 10) : 0
  } catch {
    return 0
  }
}

export function skipVersion(versionCode: number) {
  window.localStorage.setItem(SKIP_VERSION_KEY, String(versionCode))
}
