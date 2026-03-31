export type StorageKind =
  | 'local'
  | 'session'
  | 'memory'
  | 'localforage'
  | 'electron'
  | 'cookie'
  | 'custom'

export type SyncStorageKind =
  | 'local'
  | 'session'
  | 'memory'
  | 'electron'
  | 'cookie'
  | 'custom'

export interface Encryptor {
  encrypt: (plain: string) => string
  decrypt: (cipher: string) => string
}

export const NoneEncryptor: Encryptor = {
  encrypt: s => s,
  decrypt: s => s,
}

export interface Codec {
  serialize: (value: unknown) => string
  deserialize: <T = unknown>(input: string) => T
}

export const JsonCodec: Codec = {
  serialize: (value: unknown) => JSON.stringify(value),
  deserialize: <T = unknown>(input: string): T => JSON.parse(input) as T,
}

export interface StoredEntry<T = any> {
  value: T
  expiresAt?: number
}

export interface SyncDriver {
  kind: SyncStorageKind
  get: (key: string) => string | undefined
  set: (key: string, value: string | null | undefined) => void
  remove: (key: string) => void
  keys: (prefix?: string) => string[]
}

export interface AsyncDriver {
  kind: StorageKind
  get: (key: string) => Promise<string | undefined>
  set: (key: string, value: string | null | undefined) => Promise<void>
  remove: (key: string) => Promise<void>
  keys: (prefix?: string) => Promise<string[]>
}

export interface BaseStorageOptions {
  kind: StorageKind
  prefix: string
  /**
   * 可选加密密钥：
   * - string: 单一密钥字符串
   * - string[]: 多段密钥，库内部会进行拼接与派生
   * 若未提供，则不做加密，仅做 Codec 序列化。
   */
  encryptionSecret?: string | string[]
  defaultTTLSeconds?: number
  codec?: Codec
  driverOptions?: unknown
  driver?: SyncDriver | AsyncDriver
}

export interface SyncStorageOptions extends Omit<BaseStorageOptions, 'kind' | 'driver'> {
  kind: SyncStorageKind
  driver?: SyncDriver
}

export interface AsyncStorageOptions extends Omit<BaseStorageOptions, 'kind' | 'driver'> {
  kind: StorageKind
  driver?: AsyncDriver
}

export interface SyncStore {
  readonly kind: SyncStorageKind
  readonly prefix: string

  get: <T = unknown>(key: string, defaultValue?: T) => T | undefined
  set: <T = unknown>(key: string, value: T | null | undefined) => void
  has: (key: string) => boolean
  remove: (key: string) => void
  keys: (subPrefix?: string) => string[]
  /**
   * 清理当前 prefix 下的所有 key。
   * - 不传参：清理全部
   * - 传 string[]：视为需要保留的 key 列表（向下兼容）
   * - 传对象：{ excludeKeys }，推荐使用此形式（类型更清晰）
   */
  clear: (options?: { excludeKeys?: string[] } | string[]) => void
}

export interface AsyncStore {
  readonly kind: StorageKind
  readonly prefix: string

  get: <T = unknown>(key: string, defaultValue?: T) => Promise<T | undefined>
  set: <T = unknown>(key: string, value: T | null | undefined) => Promise<void>
  has: (key: string) => Promise<boolean>
  remove: (key: string) => Promise<void>
  keys: (subPrefix?: string) => Promise<string[]>
  /**
   * 清理当前 prefix 下的所有 key。
   * - 不传参：清理全部
   * - 传 string[]：视为需要保留的 key 列表（向下兼容）
   * - 传对象：{ excludeKeys }，推荐使用此形式（类型更清晰）
   */
  clear: (options?: { excludeKeys?: string[] } | string[]) => Promise<void>
}
