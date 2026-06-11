export const APP_VERSION = '1.5.0'
export const APP_VERSION_CODE = 6

/*
  版本检查 JSONBlob 地址
  替换为你的 JSONBlob ID，格式如下：
  {
    "version": "1.5.0",
    "versionCode": 6,
    "apkUrl": "https://your-server.com/Why-v1.5-debug.apk",
    "releaseNotes": "更新内容说明"
  }
*/
const VERSION_BLOB_ID = '019eb649-ab99-72ca-bf7c-6381c3d8f66b'
export const VERSION_CHECK_URL =
  import.meta.env.DEV
    ? '/version-api'
    : `https://jsonblob.com/api/jsonBlob/${VERSION_BLOB_ID}`

export type UpdateInfo = {
  version: string
  versionCode: number
  apkUrl: string
  releaseNotes: string
}

function isUpdateInfo(value: unknown): value is UpdateInfo {
  if (!value || typeof value !== 'object') return false
  const info = value as Partial<UpdateInfo>
  return (
    typeof info.version === 'string' &&
    typeof info.versionCode === 'number' &&
    typeof info.apkUrl === 'string' &&
    typeof info.releaseNotes === 'string'
  )
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const response = await fetch(VERSION_CHECK_URL, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return null
    const data: unknown = await response.json()
    if (isUpdateInfo(data) && data.versionCode > APP_VERSION_CODE) {
      return data
    }
    return null
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
