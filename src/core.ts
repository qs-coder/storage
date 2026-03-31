import type { StoredEntry } from './types'

/**
 * 获取当前时间戳（毫秒）
 */
export function now(): number {
  return Date.now()
}

/**
 * 检查存储条目是否已过期
 */
export function isExpired(entry?: StoredEntry<any> | null): boolean {
  if (!entry || !entry.expiresAt) {
    return false
  }
  return entry.expiresAt <= now()
}

/**
 * 去除键的前缀
 * 使用 startsWith + slice 而非 replace，避免前缀包含特殊字符时的 bug
 */
export function stripPrefix(key: string, prefix: string): string {
  if (prefix && key.startsWith(prefix)) {
    return key.slice(prefix.length)
  }
  return key
}

/**
 * 解析 clear 方法的 options 参数
 * 支持两种形式：string[]（向下兼容）或 { excludeKeys?: string[] }
 */
export function parseClearOptions(
  options?: { excludeKeys?: string[] } | string[],
): string[] | undefined {
  if (Array.isArray(options)) {
    return options
  }
  return options?.excludeKeys
}
