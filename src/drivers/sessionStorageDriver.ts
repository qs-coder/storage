import type { SyncStorageKind } from '../types'
import { WebStorageDriver } from './webStorageDriver'

export class SessionStorageDriver extends WebStorageDriver {
  public readonly kind: SyncStorageKind = 'session'

  protected getStorage(): Storage {
    const win = (globalThis as any).window as (Window & typeof globalThis) | undefined
    if (!win || !win.sessionStorage) {
      throw new Error('[SessionStorageDriver] window.sessionStorage 不可用')
    }
    return win.sessionStorage
  }
}
