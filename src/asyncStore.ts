import type {
  AsyncDriver,
  AsyncStore,
  BaseStorageOptions,
  Codec,
  StoredEntry,
  SyncDriver,
} from './types'
import { JsonCodec } from './types'
import { MemoryDriver } from './drivers/memoryDriver'
import { LocalStorageDriver } from './drivers/localStorageDriver'
import { SessionStorageDriver } from './drivers/sessionStorageDriver'
import { CookieDriver } from './drivers/cookieDriver'
import { createEncryptor } from './encryption'
import { isExpired, now, parseClearOptions, stripPrefix } from './core'

function wrapSyncDriverAsAsync(sync: SyncDriver): AsyncDriver {
  return {
    kind: sync.kind,
    async get(key) {
      return sync.get(key)
    },
    async set(key, value) {
      sync.set(key, value)
    },
    async remove(key) {
      sync.remove(key)
    },
    async keys(prefix) {
      return sync.keys(prefix)
    },
  }
}

function createAsyncDriver(options: BaseStorageOptions): AsyncDriver {
  const { kind, driverOptions, driver } = options

  if (driver) {
    // 这里假定外部传入的 driver 已经是 AsyncDriver
    // 如需支持自定义 SyncDriver，可在外部自行使用 wrapSyncDriverAsAsync 包装
    return driver as AsyncDriver
  }

  switch (kind) {
    case 'memory':
      return wrapSyncDriverAsAsync(new MemoryDriver())
    case 'electron': {
      // electron-store 仅在 Electron 主进程可用，懒加载
      // eslint-disable-next-line ts/no-require-imports
      const { ElectronStoreDriver } = require('./drivers/electronStoreDriver') as typeof import('./drivers/electronStoreDriver')
      return wrapSyncDriverAsAsync(new ElectronStoreDriver(driverOptions as any))
    }
    case 'local':
      return wrapSyncDriverAsAsync(new LocalStorageDriver())
    case 'session':
      return wrapSyncDriverAsAsync(new SessionStorageDriver())
    case 'cookie':
      return wrapSyncDriverAsAsync(new CookieDriver())
    case 'localforage': {
      // localforage 仅在浏览器环境可用，懒加载避免 Node/Electron 端引入
      // eslint-disable-next-line ts/no-require-imports
      const { LocalForageDriver } = require('./drivers/localForageDriver') as typeof import('./drivers/localForageDriver')
      return new LocalForageDriver(driverOptions as any)
    }
    default:
      throw new Error(`[createStorage] kind "${kind}" 暂未实现 async driver`)
  }
}

export function createStorage(options: BaseStorageOptions): AsyncStore {
  const { prefix, defaultTTLSeconds } = options
  const encryptor = createEncryptor(options.encryptionSecret)
  const codec: Codec = options.codec ?? JsonCodec
  const driver = createAsyncDriver(options)

  const makeKey = (key: string) => `${prefix}.${key}`

  async function loadEntry<T>(key: string): Promise<StoredEntry<T> | undefined> {
    const fullKey = makeKey(key)
    const raw = await driver.get(fullKey)
    if (raw == null) {
      return undefined
    }

    let entry: StoredEntry<T> | undefined
    try {
      const decrypted = encryptor.decrypt(raw)
      entry = codec.deserialize<StoredEntry<T>>(decrypted)
    }
    catch {
      await driver.remove(fullKey)
      return undefined
    }

    if (isExpired(entry)) {
      await driver.remove(fullKey)
      return undefined
    }
    return entry
  }

  async function saveEntry<T>(key: string, value: T | null | undefined): Promise<void> {
    const fullKey = makeKey(key)
    if (value == null) {
      await driver.remove(fullKey)
      return
    }

    const entry: StoredEntry<T> = { value }

    if (typeof defaultTTLSeconds === 'number' && defaultTTLSeconds > 0) {
      entry.expiresAt = now() + defaultTTLSeconds * 1000
    }

    const plain = codec.serialize(entry)
    const cipher = encryptor.encrypt(plain)
    await driver.set(fullKey, cipher)
  }

  const store: AsyncStore = {
    kind: driver.kind,
    prefix,

    async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
      const entry = await loadEntry<T>(key)
      if (!entry) {
        return defaultValue
      }
      return (entry.value as T) ?? defaultValue
    },

    async set<T>(key: string, value: T | null | undefined): Promise<void> {
      await saveEntry(key, value)
    },

    async has(key: string): Promise<boolean> {
      const entry = await loadEntry(key)
      return entry !== undefined
    },

    async remove(key: string): Promise<void> {
      await driver.remove(makeKey(key))
    },

    async keys(subPrefix?: string): Promise<string[]> {
      const p = subPrefix ? `${prefix}.${subPrefix}` : `${prefix}.`
      const all = await driver.keys(p)
      return all.map(k => stripPrefix(k, `${prefix}.`))
    },

    async clear(options?: { excludeKeys?: string[] } | string[]): Promise<void> {
      const allFullKeys = await driver.keys(`${prefix}.`)

      const excludeKeys = parseClearOptions(options)
      const excludeSet = new Set(
        (excludeKeys ?? []).map(k => `${prefix}.${k}`),
      )
      const toDelete = allFullKeys.filter(fullKey => !excludeSet.has(fullKey))
      await Promise.all(toDelete.map(k => driver.remove(k)))
    },
  }

  return store
}
