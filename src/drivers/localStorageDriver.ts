import type { SyncStorageKind } from '../types'
import { WebStorageDriver } from './webStorageDriver'

export class LocalStorageDriver extends WebStorageDriver {
  public readonly kind: SyncStorageKind = 'local'

  protected getStorage(): Storage {
    const win = (globalThis as any).window as (Window & typeof globalThis) | undefined
    if (!win || !win.localStorage) {
      throw new Error('[LocalStorageDriver] window.localStorage 不可用')
    }
    return win.localStorage
  }
}
