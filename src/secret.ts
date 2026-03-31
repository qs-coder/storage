import { Buffer } from 'buffer/'

export const OBF_PREFIX = '__im_obf:'
export const OBF_KEY = 'CtqImStorageObf2024'

function xorTransform(str: string, key: string): string {
  let result = ''
  for (let i = 0; i < str.length; i++) {
    result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return result
}

/**
 * 从多源组装密钥：将密钥拆成多段存于不同文件/来源，运行时合并
 */
export function assembleStorageSecret(...parts: Array<string | number | boolean | null | undefined>): string {
  return parts
    .filter(p => p != null && p !== '')
    .map(p => String(p))
    .join('')
}

/**
 * 混淆密钥：将明文转为混淆串，可安全写入配置或日志
 * 与 deobfuscateSecret 配合，调用方可选择在外部做混淆后再传给 storage
 */
export function obfuscateSecret(plain: string | undefined | null): string | undefined | null {
  if (!plain || typeof plain !== 'string') {
    return plain
  }
  const mixed = xorTransform(plain, OBF_KEY)
  // 使用全局 Buffer（Node）或由打包器提供的 polyfill（浏览器）

  return OBF_PREFIX + Buffer.from(mixed, 'utf8').toString('base64')
}

/**
 * 解混淆：识别 __im_obf: 前缀并还原明文；若不是混淆格式则原样返回
 */
export function deobfuscateSecret(input: string | undefined | null): string | undefined | null {
  if (!input || typeof input !== 'string') {
    return input
  }
  if (!input.startsWith(OBF_PREFIX)) {
    return input
  }
  try {
    const decoded = Buffer.from(input.slice(OBF_PREFIX.length), 'base64').toString('utf8')
    return xorTransform(decoded, OBF_KEY)
  }
  catch {
    return input
  }
}

/**
 * 统一归一化 encryptionSecret 入参：
 * - string[]: 视为多段密钥，内部用 assembleStorageSecret 拼接
 * - string: 直接返回
 */
export function normalizeEncryptionSecret(
  input: string | string[] | undefined | null,
): string | undefined {
  if (Array.isArray(input)) {
    return assembleStorageSecret(...input)
  }
  if (typeof input === 'string' && input) {
    return input
  }
  return undefined
}
