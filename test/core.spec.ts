import { describe, it, expect, vi } from 'vitest'
import { now, isExpired, stripPrefix, parseClearOptions } from '../src/core'
import type { StoredEntry } from '../src/types'

describe('now', () => {
  it('返回当前时间戳（毫秒）', () => {
    const before = Date.now()
    const result = now()
    const after = Date.now()
    expect(result).toBeGreaterThanOrEqual(before)
    expect(result).toBeLessThanOrEqual(after)
  })
})

describe('isExpired', () => {
  it('无 entry 返回 false', () => {
    expect(isExpired(null)).toBe(false)
    expect(isExpired(undefined)).toBe(false)
  })

  it('无 expiresAt 返回 false', () => {
    expect(isExpired({ value: 'test' })).toBe(false)
  })

  it('expiresAt 在未来返回 false', () => {
    const entry: StoredEntry = { value: 'test', expiresAt: Date.now() + 100000 }
    expect(isExpired(entry)).toBe(false)
  })

  it('expiresAt 在过去返回 true', () => {
    const entry: StoredEntry = { value: 'test', expiresAt: Date.now() - 1000 }
    expect(isExpired(entry)).toBe(true)
  })

  it('expiresAt 恰好等于当前时间返回 true', () => {
    const t = Date.now()
    const entry: StoredEntry = { value: 'test', expiresAt: t }
    // 由于 isExpired 使用 <= 判断，可能因为时间差返回 true
    // 这个测试验证 <= 语义
    expect(isExpired(entry)).toBe(true)
  })
})

describe('stripPrefix', () => {
  it('正常去除前缀', () => {
    expect(stripPrefix('prefix.key', 'prefix.')).toBe('key')
  })

  it('嵌套前缀：仅去除第一次出现', () => {
    // 这是之前 replace() bug 的回归测试
    expect(stripPrefix('pfx.pfx.key', 'pfx.')).toBe('pfx.key')
  })

  it('前缀不匹配时原样返回', () => {
    expect(stripPrefix('other.key', 'pfx.')).toBe('other.key')
  })

  it('空前缀原样返回', () => {
    expect(stripPrefix('key', '')).toBe('key')
  })

  it('完全等于前缀时返回空字符串', () => {
    expect(stripPrefix('pfx.', 'pfx.')).toBe('')
  })
})

describe('parseClearOptions', () => {
  it('undefined 返回 undefined', () => {
    expect(parseClearOptions()).toBeUndefined()
  })

  it('string[] 直接返回', () => {
    const keys = ['a', 'b']
    expect(parseClearOptions(keys)).toEqual(['a', 'b'])
  })

  it('{ excludeKeys } 返回数组', () => {
    expect(parseClearOptions({ excludeKeys: ['a'] })).toEqual(['a'])
  })

  it('{ excludeKeys: undefined } 返回 undefined', () => {
    expect(parseClearOptions({ excludeKeys: undefined })).toBeUndefined()
  })

  it('空对象返回 undefined', () => {
    expect(parseClearOptions({})).toBeUndefined()
  })
})
