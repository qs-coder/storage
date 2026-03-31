import type {
  BaseStorageOptions,
  Codec,
  StoredEntry,
  SyncDriver,
  SyncStorageKind,
  SyncStore,
} from './types'
import { JsonCodec } from './types'
import { MemoryDriver } from './drivers/memoryDriver'
import { LocalStorageDriver } from './drivers/localStorageDriver'
import { SessionStorageDriver } from './drivers/sessionStorageDriver'
import { CookieDriver } from './drivers/cookieDriver'
import { createEncryptor } from './encryption'
import { normalizeEncryptionSecret } from './secret'
import { isExpired, now, parseClearOptions, stripPrefix } from './core'

function createSyncDriver(options: BaseStorageOptions & { kind: SyncStorageKind }): SyncDriver {
  const { kind, driverOptions, driver } = options

  if (driver) {
    return driver as SyncDriver
  }

  switch (kind) {
    case 'memory':
      return new MemoryDriver()
    case 'electron': {
      // electron-store 仅在 Electron 主进程可用，使用懒加载避免浏览器端引入
      // eslint-disable-next-line ts/no-require-imports
      const { ElectronStoreDriver } = require('./drivers/electronStoreDriver') as typeof import('./drivers/electronStoreDriver')
      const opts = { ...(driverOptions as object || {}) }
      const normalized = normalizeEncryptionSecret(options.encryptionSecret)
      if (normalized) {
        Object.assign(opts, {
          encryptionKey: normalized,
          encryptionAlgorithm: 'aes-256-gcm' as const,
          cwd: 'data',
        })
      }
      return new ElectronStoreDriver(opts)
    }
    case 'local':
      return new LocalStorageDriver()
    case 'session':
      return new SessionStorageDriver()
    case 'cookie':
      return new CookieDriver()
    default:
      throw new Error(`[createStorageSync] kind "${kind}" 暂未实现同步 driver`)
  }
}

export function createStorageSync(options: BaseStorageOptions & { kind: SyncStorageKind }): SyncStore {
  const { prefix, defaultTTLSeconds } = options
  const encryptor = createEncryptor(options.encryptionSecret)
  const codec: Codec = options.codec ?? JsonCodec
  const driver = createSyncDriver(options)

  const makeKey = (key: string) => `${prefix}.${key}`

  function loadEntry<T>(key: string): StoredEntry<T> | undefined {
    const fullKey = makeKey(key)
    const raw = driver.get(fullKey)
    if (raw == null) {
      return undefined
    }

    let entry: StoredEntry<T> | undefined
    try {
      const decrypted = encryptor.decrypt(raw)
      entry = codec.deserialize<StoredEntry<T>>(decrypted)
    }
    catch {
      driver.remove(fullKey)
      return undefined
    }

    if (isExpired(entry)) {
      driver.remove(fullKey)
      return undefined
    }
    return entry
  }

  function saveEntry<T>(key: string, value: T | null | undefined): void {
    const fullKey = makeKey(key)
    if (value == null) {
      driver.remove(fullKey)
      return
    }

    const entry: StoredEntry<T> = { value }

    if (typeof defaultTTLSeconds === 'number' && defaultTTLSeconds > 0) {
      entry.expiresAt = now() + defaultTTLSeconds * 1000
    }

    const plain = codec.serialize(entry)
    const cipher = encryptor.encrypt(plain)
    driver.set(fullKey, cipher)
  }

  const store: SyncStore = {
    kind: driver.kind,
    prefix,

    get<T>(key: string, defaultValue?: T): T | undefined {
      const entry = loadEntry<T>(key)
      if (!entry) {
        return defaultValue
      }
      return (entry.value as T) ?? defaultValue
    },

    set<T>(key: string, value: T | null | undefined): void {
      saveEntry(key, value)
    },

    has(key: string): boolean {
      const entry = loadEntry(key)
      return entry !== undefined
    },

    remove(key: string): void {
      driver.remove(makeKey(key))
    },

    keys(subPrefix?: string): string[] {
      const p = subPrefix ? `${prefix}.${subPrefix}` : `${prefix}.`
      const all = driver.keys(p)
      return all.map(k => stripPrefix(k, `${prefix}.`))
    },

    clear(options?: { excludeKeys?: string[] } | string[]): void {
      const allFullKeys = driver.keys(`${prefix}.`)

      const excludeKeys = parseClearOptions(options)
      const excludeSet = new Set(
        (excludeKeys ?? []).map(k => `${prefix}.${k}`),
      )
      const toDelete = allFullKeys.filter(fullKey => !excludeSet.has(fullKey))
      toDelete.forEach(k => driver.remove(k))
    },
  }

  return store
}
