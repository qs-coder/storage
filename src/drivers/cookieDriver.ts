import type { SyncDriver, SyncStorageKind } from '../types'

/** Cookie 大小限制（约 3KB，留余量） */
const COOKIE_SIZE_LIMIT = 3072

function ensureDocument(): Document {
  const doc = (globalThis as any).document as Document | undefined
  if (!doc) {
    throw new TypeError('[CookieDriver] document 不可用')
  }
  return doc
}

function parseCookies(): Record<string, string> {
  const doc = ensureDocument()
  const res: Record<string, string> = {}
  const raw = doc.cookie || ''
  if (!raw) {
    return res
  }
  const parts = raw.split(';')
  for (const part of parts) {
    const [name, ...rest] = part.split('=')
    if (!name) {
      continue
    }
    const key = decodeURIComponent(name.trim())
    const value = decodeURIComponent(rest.join('=').trim())
    res[key] = value
  }
  return res
}

export class CookieDriver implements SyncDriver {
  public readonly kind: SyncStorageKind = 'cookie'

  get(key: string): string | undefined {
    const map = parseCookies()
    return map[key]
  }

  set(key: string, value: string | null | undefined): void {
    const doc = ensureDocument()
    const encodedKey = encodeURIComponent(key)
    if (value == null) {
      // 通过设置过期时间删除
      doc.cookie = `${encodedKey}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
      return
    }
    const encodedValue = encodeURIComponent(value)
    const cookieString = `${encodedKey}=${encodedValue}; path=/`

    // 检查 cookie 大小，超过限制时发出警告
    if (cookieString.length > COOKIE_SIZE_LIMIT) {
      console.warn(
        `[CookieDriver] Cookie "${key}" 大小 (${cookieString.length} bytes) `
        + `超过建议限制 (${COOKIE_SIZE_LIMIT} bytes)，可能被浏览器截断`,
      )
    }

    doc.cookie = cookieString
  }

  remove(key: string): void {
    this.set(key, null)
  }

  keys(prefix?: string): string[] {
    const map = parseCookies()
    const all = Object.keys(map)
    if (!prefix) {
      return all
    }
    return all.filter(k => k.startsWith(prefix))
  }
}
