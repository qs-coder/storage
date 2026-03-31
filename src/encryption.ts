import { sm3, sm4 } from 'sm-crypto'
import type { Encryptor } from './types'
import { NoneEncryptor } from './types'
import { normalizeEncryptionSecret } from './secret'

/**
 * 混合密钥：对原始密钥进行混淆处理
 */
function mixSecret(raw: string): string {
  const salt = '#IM_BASE_STORAGE_V1'
  const len = raw.length
  const mid = Math.floor(len / 2)
  const left = raw.slice(0, mid)
  const right = raw.slice(mid)
  const reversed = raw.split('').reverse().join('')
  return `${right}|${len}|${left}|${reversed}|${salt}`
}

/**
 * 基于字符串 secret 的默认加密实现（国密 SM4）。
 *
 * - 内部使用 sm-crypto 提供的 SM3 + SM4：
 *   - 先对 secret 做一轮自定义混淆，再做 SM3 哈希，取前 16 字节作为 SM4 密钥
 *   - 使用 SM4-CBC 模式，IV 由 secret 派生
 * - 只暴露一个简单的字符串/字符串数组 secret 给调用方：
 *   - 可以是 userId、appId、常量、函数计算结果等，只要最终是 string 即可
 * - 若未提供 secret，则返回透传的 Encryptor（不加密）
 */
export function createEncryptor(secret?: string | string[]): Encryptor {
  const normalized = normalizeEncryptionSecret(secret)
  if (!normalized) {
    return NoneEncryptor
  }

  const mixed = mixSecret(normalized)
  const keyHex = sm3(mixed).slice(0, 32)
  // CBC 模式需要 IV，使用基于 secret 派生的复杂 16 字节 hex
  const ivHex = sm3(`${mixed}#IM_STORAGE_IV_V1`).slice(0, 32)

  const encrypt: Encryptor['encrypt'] = (plain: string): string => {
    if (!plain) {
      return plain
    }
    return sm4.encrypt(plain, keyHex, { mode: 'cbc', iv: ivHex })
  }

  const decrypt: Encryptor['decrypt'] = (cipherText: string): string => {
    if (!cipherText) {
      return cipherText
    }
    return sm4.decrypt(cipherText, keyHex, { mode: 'cbc', iv: ivHex })
  }

  return { encrypt, decrypt }
}
