import localforage from 'localforage'
import type { AsyncDriver, StorageKind } from '../types'

export type LocalForageDriverOptions = Parameters<typeof localforage.createInstance>[0]

export class LocalForageDriver implements AsyncDriver {
  public readonly kind: StorageKind = 'localforage'
  private readonly lf: ReturnType<typeof localforage.createInstance>

  constructor(options?: LocalForageDriverOptions) {
    this.lf = localforage.createInstance(options ?? {})
  }

  async get(key: string): Promise<string | undefined> {
    const v = await this.lf.getItem<string | null>(key)
    return v == null ? undefined : v
  }

  async set(key: string, value: string | null | undefined): Promise<void> {
    if (value == null) {
      await this.lf.removeItem(key)
    }
    else {
      await this.lf.setItem(key, value)
    }
  }

  async remove(key: string): Promise<void> {
    await this.lf.removeItem(key)
  }

  async keys(prefix?: string): Promise<string[]> {
    const all: string[] = await this.lf.keys()
    if (!prefix) {
      return all
    }
    return all.filter(k => k.startsWith(prefix))
  }
}
