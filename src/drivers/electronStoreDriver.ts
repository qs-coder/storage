import Store, { type Options as ElectronStoreOptions } from 'electron-store'
import type { SyncDriver, SyncStorageKind } from '../types'

export type ElectronStoreDriverOptions = ElectronStoreOptions<Record<string, any>>

export class ElectronStoreDriver implements SyncDriver {
  public readonly kind: SyncStorageKind = 'electron'
  private store: Store

  constructor(options?: ElectronStoreDriverOptions) {
    this.store = new Store(options)
  }

  get(key: string): string | undefined {
    const v = this.store.get(key)
    if (v == null) {
      return undefined
    }
    return typeof v === 'string' ? v : String(v)
  }

  set(key: string, value: string | null | undefined): void {
    if (value == null) {
      this.store.delete(key)
    }
    else {
      this.store.set(key, value)
    }
  }

  remove(key: string): void {
    this.store.delete(key)
  }

  keys(prefix?: string): string[] {
    const allKeys = Object.keys(this.store.store ?? {})
    if (!prefix) {
      return allKeys
    }
    return allKeys.filter(k => k.startsWith(prefix))
  }
}
