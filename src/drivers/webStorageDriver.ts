import type { SyncDriver, SyncStorageKind } from '../types'

/**
 * Web Storage API 抽象基类
 * 封装了 localStorage 和 sessionStorage 的共同逻辑
 */
export abstract class WebStorageDriver implements SyncDriver {
  public abstract readonly kind: SyncStorageKind

  /**
   * 获取具体的 Storage 实例，由子类实现
   */
  protected abstract getStorage(): Storage

  get(key: string): string | undefined {
    const s = this.getStorage().getItem(key)
    return s === null ? undefined : s
  }

  set(key: string, value: string | null | undefined): void {
    const storage = this.getStorage()
    if (value == null) {
      storage.removeItem(key)
    }
    else {
      storage.setItem(key, value)
    }
  }

  remove(key: string): void {
    this.getStorage().removeItem(key)
  }

  keys(prefix?: string): string[] {
    const storage = this.getStorage()
    const all: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i)
      if (k != null) {
        all.push(k)
      }
    }
    if (!prefix) {
      return all
    }
    return all.filter(k => k.startsWith(prefix))
  }
}
