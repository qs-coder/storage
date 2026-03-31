import { describe, expect, it } from 'vitest'
import { createStorageSync } from '../src'
import type { SyncStore } from '../src'

describe('createStorageSync / memory', () => {
  function createTestStore(opts?: Record<string, unknown>): SyncStore {
    return createStorageSync({
      kind: 'memory',
      prefix: 'test',
      ...opts,
    })
  }

  it('基础 get/set/has 行为 & 默认不过期', () => {
    const store = createTestStore()

    store.set('foo', 123)
    expect(store.get<number>('foo')).toBe(123)

    expect(store.get('bar', 999)).toBe(999)
    expect(store.has('foo')).toBe(true)
    expect(store.has('bar')).toBe(false)
  })

  it('前缀隔离：不同 prefix 不互相影响', () => {
    const s1 = createStorageSync({ kind: 'memory', prefix: 'p1' })
    const s2 = createStorageSync({ kind: 'memory', prefix: 'p2' })

    s1.set('k', 'v1')
    s2.set('k', 'v2')

    expect(s1.get('k')).toBe('v1')
    expect(s2.get('k')).toBe('v2')

    expect(s1.keys()).toEqual(['k'])
    expect(s2.keys()).toEqual(['k'])
  })

  it('TTL：设置 defaultTTLSeconds 后，过期数据自动清理', async () => {
    const store = createTestStore({ defaultTTLSeconds: 1 })

    store.set('t', 'value')
    expect(store.get('t')).toBe('value')

    await new Promise(resolve => setTimeout(resolve, 1200))

    expect(store.get('t')).toBeUndefined()
    expect(store.has('t')).toBe(false)
  })

  it('clear() 无参：清理当前 prefix 下所有 key', () => {
    const store = createTestStore()

    store.set('a', 1)
    store.set('b', 2)
    expect(store.keys().sort()).toEqual(['a', 'b'])

    store.clear()
    expect(store.keys()).toEqual([])
    expect(store.get('a')).toBeUndefined()
    expect(store.get('b')).toBeUndefined()
  })

  it('clear(excludeKeys: string[])：保留指定 key', () => {
    const store = createTestStore()

    store.set('keep', 1)
    store.set('drop', 2)
    store.set('drop2', 3)

    store.clear(['keep'])

    expect(store.get('keep')).toBe(1)
    expect(store.get('drop')).toBeUndefined()
    expect(store.get('drop2')).toBeUndefined()
  })

  it('clear({ excludeKeys })：行为与传数组一致', () => {
    const store = createTestStore()

    store.set('keep', 1)
    store.set('drop', 2)

    store.clear({ excludeKeys: ['keep'] })

    expect(store.get('keep')).toBe(1)
    expect(store.get('drop')).toBeUndefined()
  })

  it('加密：设置 encryptionSecret 后，对外仍返回明文', () => {
    const secret = 'user-001'
    const store = createStorageSync({
      kind: 'memory',
      prefix: 'enc',
      encryptionSecret: secret,
    })

    store.set('foo', 'bar')
    const v = store.get('foo')
    expect(v).toBe('bar')
  })

  it('keys() 前缀边界：包含前缀的 key 不被误截断', () => {
    const store = createTestStore()

    // 之前 replace() 的 bug：如果 key 名包含与 prefix 相同的字符串，
    // replace 会替换所有匹配。stripPrefix 修复后只去除开头前缀。
    store.set('test.key', 'v1')
    store.set('normal', 'v2')

    const allKeys = store.keys()
    expect(allKeys).toContain('test.key')
    expect(allKeys).toContain('normal')
    expect(allKeys.length).toBe(2)
  })

  it('keys(subPrefix)：过滤子前缀', () => {
    const store = createTestStore()

    store.set('user.name', 'alice')
    store.set('user.age', 30)
    store.set('app.name', 'im')

    const userKeys = store.keys('user')
    expect(userKeys.sort()).toEqual(['user.age', 'user.name'])
  })

  it('set(null/undefined) 等同删除', () => {
    const store = createTestStore()

    store.set('k', 'v')
    expect(store.has('k')).toBe(true)

    store.set('k', null)
    expect(store.has('k')).toBe(false)

    store.set('k2', 'v2')
    store.set('k2', undefined)
    expect(store.has('k2')).toBe(false)
  })

  it('存储各种类型的值：number, boolean, object, array', () => {
    const store = createTestStore()

    store.set('num', 42)
    store.set('bool', true)
    store.set('obj', { a: 1, b: 'two' })
    store.set('arr', [1, 2, 3])
    store.set('empty-obj', {})
    store.set('empty-arr', [])

    expect(store.get<number>('num')).toBe(42)
    expect(store.get<boolean>('bool')).toBe(true)
    expect(store.get<{ a: number; b: string }>('obj')).toEqual({ a: 1, b: 'two' })
    expect(store.get<number[]>('arr')).toEqual([1, 2, 3])
    expect(store.get('empty-obj')).toEqual({})
    expect(store.get('empty-arr')).toEqual([])
  })

  it('损坏数据：读取时自动清除', () => {
    const store = createTestStore()
    // 通过加密 store 写入，然后换个加密密钥读——会触发解密失败自动清理
    const store2 = createStorageSync({
      kind: 'memory',
      prefix: 'corrupt',
      encryptionSecret: 'key-a',
    })

    store2.set('data', 'important')
    expect(store2.get('data')).toBe('important')

    // 用不同密钥创建 store（共享 memory 驱动，但由于 prefix 不同不会冲突）
    // 这里测试的是：当 driver 层返回的数据无法被正确 decrypt 时，
    // loadEntry 会 catch 异常并返回 undefined
    const store3 = createStorageSync({
      kind: 'memory',
      prefix: 'corrupt',
      encryptionSecret: 'key-b',
    })

    // 由于密钥不同，解密会失败，返回 undefined
    expect(store3.get('data')).toBeUndefined()
  })

  it('remove 不存在的 key 不报错', () => {
    const store = createTestStore()
    expect(() => store.remove('nonexistent')).not.toThrow()
  })

  it('localStorage driver：在模拟浏览器环境下可用', () => {
    class FakeStorage {
      private map = new Map<string, string>()

      get length() {
        return this.map.size
      }

      getItem(key: string): string | null {
        return this.map.has(key) ? this.map.get(key)! : null
      }

      setItem(key: string, value: string): void {
        this.map.set(key, value)
      }

      removeItem(key: string): void {
        this.map.delete(key)
      }

      clear(): void {
        this.map.clear()
      }

      key(index: number): string | null {
        const keys = Array.from(this.map.keys())
        return keys[index] ?? null
      }
    }

    ;(globalThis as any).window = {
      localStorage: new FakeStorage(),
      sessionStorage: new FakeStorage(),
    }

    const store = createStorageSync({
      kind: 'local',
      prefix: 'ls',
    })

    store.set('k1', 'v1')
    expect(store.get('k1')).toBe('v1')
    expect(store.keys()).toEqual(['k1'])

    // sessionStorage 也走相同逻辑
    const sStore = createStorageSync({
      kind: 'session',
      prefix: 'ss',
    })
    sStore.set('k2', 'v2')
    expect(sStore.get('k2')).toBe('v2')
  })

  it('cookie driver：在模拟 document.cookie 环境下可用', () => {
    const cookies: string[] = []

    Object.defineProperty(globalThis, 'document', {
      value: {
        get cookie() {
          return cookies.join('; ')
        },
        set cookie(v: string) {
          cookies.push(v)
        },
      },
      writable: true,
      configurable: true,
    })

    const store = createStorageSync({
      kind: 'cookie',
      prefix: 'ck',
    })

    store.set('user', 'alice')
    store.set('token', 't123')

    expect(store.get('user')).toBe('alice')
    expect(store.get('token')).toBe('t123')

    // clear 保留 user
    store.clear(['user'])
    expect(store.get('user')).toBe('alice')
    expect(store.get('token')).toBeUndefined()
  })

  it('自定义 driver', () => {
    const customMap = new Map<string, string>()

    const store = createStorageSync({
      kind: 'custom',
      prefix: 'custom',
      driver: {
        kind: 'custom',
        get: (key: string) => customMap.get(key),
        set: (key: string, value: string | null | undefined) => {
          if (value == null) customMap.delete(key)
          else customMap.set(key, value)
        },
        remove: (key: string) => customMap.delete(key),
        keys: (prefix?: string) => {
          const all = Array.from(customMap.keys())
          return prefix ? all.filter(k => k.startsWith(prefix)) : all
        },
      },
    })

    store.set('hello', 'world')
    expect(store.get('hello')).toBe('world')
    expect(store.has('hello')).toBe(true)
    store.remove('hello')
    expect(store.has('hello')).toBe(false)
  })
})
