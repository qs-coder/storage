import { createStorage } from '../src'
import { describe, expect, it } from 'vitest'

describe('createStorage / async memory', () => {
  it('基础 get/set/has 行为', async () => {
    const store = createStorage({
      kind: 'memory',
      prefix: 'async',
    })

    await store.set('a', 123)
    expect(await store.get<number>('a')).toBe(123)
    expect(await store.get('b', 999)).toBe(999)
    expect(await store.has('a')).toBe(true)
    expect(await store.has('b')).toBe(false)
  })

  it('支持 TTL（异步版）', async () => {
    const store = createStorage({
      kind: 'memory',
      prefix: 'async-ttl',
      defaultTTLSeconds: 1,
    })

    await store.set('t', 'value')
    expect(await store.get('t')).toBe('value')

    await new Promise(resolve => setTimeout(resolve, 1200))

    expect(await store.get('t')).toBeUndefined()
    expect(await store.has('t')).toBe(false)
  })

  it('clear / clear(exclude) 行为', async () => {
    const store = createStorage({
      kind: 'memory',
      prefix: 'async-clear',
    })

    await store.set('a', 1)
    await store.set('b', 2)
    await store.set('c', 3)

    await store.clear(['a'])
    expect(await store.get('a')).toBe(1)
    expect(await store.get('b')).toBeUndefined()
    expect(await store.get('c')).toBeUndefined()
  })

  it('clear({ excludeKeys }) 行为', async () => {
    const store = createStorage({
      kind: 'memory',
      prefix: 'async-clear-obj',
    })

    await store.set('keep', 1)
    await store.set('drop', 2)

    await store.clear({ excludeKeys: ['keep'] })
    expect(await store.get('keep')).toBe(1)
    expect(await store.get('drop')).toBeUndefined()
  })

  it('set(null/undefined) 等同删除', async () => {
    const store = createStorage({
      kind: 'memory',
      prefix: 'async-null',
    })

    await store.set('k', 'v')
    expect(await store.has('k')).toBe(true)

    await store.set('k', null)
    expect(await store.has('k')).toBe(false)
  })

  it('keys(subPrefix) 过滤子前缀', async () => {
    const store = createStorage({
      kind: 'memory',
      prefix: 'async-keys',
    })

    await store.set('user.name', 'alice')
    await store.set('user.age', 30)
    await store.set('app.name', 'im')

    const userKeys = await store.keys('user')
    expect(userKeys.sort()).toEqual(['user.age', 'user.name'])
  })

  it('加密：设置 encryptionSecret 后正常读写', async () => {
    const store = createStorage({
      kind: 'memory',
      prefix: 'async-enc',
      encryptionSecret: 'test-secret',
    })

    await store.set('foo', 'bar')
    expect(await store.get('foo')).toBe('bar')
  })

  it('自定义 driver', async () => {
    const customMap = new Map<string, string>()

    const store = createStorage({
      kind: 'custom',
      prefix: 'async-custom',
      driver: {
        kind: 'custom',
        async get(key: string) {
          return customMap.get(key)
        },
        async set(key: string, value: string | null | undefined) {
          if (value == null) customMap.delete(key)
          else customMap.set(key, value)
        },
        async remove(key: string) {
          customMap.delete(key)
        },
        async keys(prefix?: string) {
          const all = Array.from(customMap.keys())
          return prefix ? all.filter(k => k.startsWith(prefix)) : all
        },
      },
    })

    await store.set('hello', 'world')
    expect(await store.get('hello')).toBe('world')
    expect(await store.has('hello')).toBe(true)
    await store.remove('hello')
    expect(await store.has('hello')).toBe(false)
  })

  // localforage 依赖 IndexedDB，Node.js 环境不可用，仅在浏览器环境运行
  it.skip('localforage driver：基本读写行为', async () => {
    const store = createStorage({
      kind: 'localforage',
      prefix: 'lf',
      driverOptions: {
        name: 'im-storage-test',
        storeName: 'lf-store',
      },
    })

    await store.set('foo', 'bar')
    expect(await store.get('foo')).toBe('bar')

    await store.remove('foo')
    expect(await store.get('foo')).toBeUndefined()
  })
})
