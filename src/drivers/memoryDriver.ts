import type { SyncDriver, SyncStorageKind } from '../types'

export class MemoryDriver implements SyncDriver {
  public readonly kind: SyncStorageKind = 'memory'
  private map = new Map<string, string>()

  get(key: string): string | undefined {
    return this.map.get(key)
  }

  set(key: string, value: string | null | undefined): void {
    if (value == null) {
      this.map.delete(key)
    }
    else {
      this.map.set(key, value)
    }
  }

  remove(key: string): void {
    this.map.delete(key)
  }

  keys(prefix?: string): string[] {
    const keys = Array.from(this.map.keys())
    if (!prefix) {
      return keys
    }
    return keys.filter(k => k.startsWith(prefix))
  }
}
