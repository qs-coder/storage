import { describe, it, expect } from 'vitest'
import {
  assembleStorageSecret,
  obfuscateSecret,
  deobfuscateSecret,
  normalizeEncryptionSecret,
} from '../src/secret'

describe('assembleStorageSecret', () => {
  it('拼接多个非空段', () => {
    expect(assembleStorageSecret('a', 'b', 'c')).toBe('abc')
  })

  it('跳过 null / undefined / 空字符串', () => {
    expect(assembleStorageSecret('a', null, undefined, '', 'b')).toBe('ab')
  })

  it('支持 number 和 boolean', () => {
    expect(assembleStorageSecret('id-', 42, true)).toBe('id-42true')
  })

  it('全部为空时返回空字符串', () => {
    expect(assembleStorageSecret(null, undefined, '')).toBe('')
  })
})

describe('obfuscateSecret / deobfuscateSecret', () => {
  it('混淆后可以还原原文', () => {
    const plain = 'my-secret-key-123'
    const obf = obfuscateSecret(plain)
    expect(obf).not.toBe(plain)
    expect(obf).toContain('__im_obf:')
    expect(deobfuscateSecret(obf)).toBe(plain)
  })

  it('对非混淆字符串原样返回', () => {
    const raw = 'not-obfuscated'
    expect(deobfuscateSecret(raw)).toBe(raw)
  })

  it('null / undefined / 空字符串原样返回', () => {
    expect(obfuscateSecret(null)).toBeNull()
    expect(obfuscateSecret(undefined)).toBeUndefined()
    expect(obfuscateSecret('')).toBe('')
    expect(deobfuscateSecret(null)).toBeNull()
    expect(deobfuscateSecret(undefined)).toBeUndefined()
  })

  it('支持 Unicode 字符串', () => {
    const plain = '密钥-🔑-hello'
    const obf = obfuscateSecret(plain)
    expect(deobfuscateSecret(obf)).toBe(plain)
  })

  it('支持超长字符串', () => {
    const plain = 'x'.repeat(10000)
    const obf = obfuscateSecret(plain)
    expect(deobfuscateSecret(obf)).toBe(plain)
  })

  it('不同原文产生不同混淆结果', () => {
    const obf1 = obfuscateSecret('secret-a')
    const obf2 = obfuscateSecret('secret-b')
    expect(obf1).not.toBe(obf2)
  })
})

describe('normalizeEncryptionSecret', () => {
  it('string[] 拼接后返回', () => {
    expect(normalizeEncryptionSecret(['a', 'b'])).toBe('ab')
  })

  it('string 直接返回', () => {
    expect(normalizeEncryptionSecret('hello')).toBe('hello')
  })

  it('undefined / null 返回 undefined', () => {
    expect(normalizeEncryptionSecret(undefined)).toBeUndefined()
    expect(normalizeEncryptionSecret(null)).toBeUndefined()
  })

  it('空字符串返回 undefined', () => {
    expect(normalizeEncryptionSecret('')).toBeUndefined()
  })

  it('空数组返回空字符串', () => {
    expect(normalizeEncryptionSecret([])).toBe('')
  })
})
