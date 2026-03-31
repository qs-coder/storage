import { describe, it, expect } from 'vitest'
import { createEncryptor } from '../src/encryption'

describe('encryption / createEncryptor', () => {
  it('未传 secret 时为透传', () => {
    const enc = createEncryptor()
    const text = 'hello-世界-123'
    const cipher = enc.encrypt(text)
    const plain = enc.decrypt(cipher)

    expect(cipher).toBe(text)
    expect(plain).toBe(text)
  })

  it('相同 secret 加解密可以还原原文', () => {
    const secret = 'user-001-app-abc'
    const enc = createEncryptor(secret)

    const text = 'hello-世界-123'
    const cipher = enc.encrypt(text)
    const plain = enc.decrypt(cipher)

    expect(cipher).not.toBe(text)
    expect(plain).toBe(text)
  })

  it('不同 secret 加密结果不同', () => {
    const text = 'hello-世界-123'

    const enc1 = createEncryptor('secret-1')
    const enc2 = createEncryptor('secret-2')

    const cipher1 = enc1.encrypt(text)
    const cipher2 = enc2.encrypt(text)

    expect(cipher1).not.toBe(cipher2)
  })

  it('string[] secret 也能正常加解密', () => {
    const enc = createEncryptor(['part1', 'part2'])
    const text = 'hello'
    const cipher = enc.encrypt(text)
    expect(enc.decrypt(cipher)).toBe(text)
  })

  it('空字符串不加密（透传）', () => {
    const enc = createEncryptor('secret')
    expect(enc.encrypt('')).toBe('')
    expect(enc.decrypt('')).toBe('')
  })

  it('超长字符串加解密', () => {
    const enc = createEncryptor('long-test')
    const text = 'x'.repeat(100000)
    const cipher = enc.encrypt(text)
    expect(enc.decrypt(cipher)).toBe(text)
  })

  it('Unicode 多语言文本加解密', () => {
    const enc = createEncryptor('unicode-key')
    const text = '你好世界🎉🎂日本語한국어العربية'
    const cipher = enc.encrypt(text)
    expect(enc.decrypt(cipher)).toBe(text)
  })

  it('JSON 字符串加解密', () => {
    const enc = createEncryptor('json-key')
    const text = JSON.stringify({ foo: 'bar', num: 42, nested: { a: [1, 2, 3] } })
    const cipher = enc.encrypt(text)
    expect(enc.decrypt(cipher)).toBe(text)
  })

  it('undefined/null/空数组 secret 均为透传', () => {
    expect(createEncryptor(undefined).encrypt('a')).toBe('a')
    expect(createEncryptor(null as any).encrypt('a')).toBe('a')
    expect(createEncryptor([]).encrypt('a')).toBe('a')
  })
})
