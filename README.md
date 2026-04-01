# @qs-coder/storage

通用存储抽象层，提供统一的同步/异步 API，支持多种存储后端和国密 SM4 加密。

## 特性

- **统一 API** — 同步（`SyncStore`）与异步（`AsyncStore`）共用一致的接口
- **多后端驱动** — memory / localStorage / sessionStorage / IndexedDB (localforage) / electron-store / cookie / 自定义
- **内置加密** — 基于国密 SM4-CBC + SM3 密钥派生，只需传入一个 secret 字符串
- **前缀隔离** — 不同 prefix 的 store 实例互不干扰，可安全共用同一后端
- **TTL 过期** — 可选的默认过期时间，过期数据读取时自动清理
- **TypeScript** — 完整类型定义，泛型支持
- **Electron 字节码** — 生产环境可通过 bytenode 编译为 `.jsc`

## 安装

```bash
pnpm add @qs-coder/storage
```

依赖项会自动安装：`buffer`、`electron-store`、`localforage`、`sm-crypto`。

## 快速开始

### 同步存储（主进程 / Node.js）

```typescript
import { createStorageSync } from '@qs-coder/storage'

// 内存存储
const store = createStorageSync({
  kind: 'memory',
  prefix: 'my-app',
})

store.set('user', { name: 'Alice', age: 30 })
const user = store.get<{ name: string; age: number }>('user')
// => { name: 'Alice', age: 30 }

store.has('user')   // true
store.remove('user')
store.has('user')   // false
```

### 异步存储（渲染进程 / 浏览器）

```typescript
import { createStorage } from '@qs-coder/storage'

const store = createStorage({
  kind: 'localforage',
  prefix: 'my-app',
  driverOptions: {
    name: 'my-app-storage',
    storeName: 'main',
  },
})

await store.set('token', 'abc123')
const token = await store.get<string>('token')
// => 'abc123'
```

## 核心 API

### `createStorageSync(options)` → `SyncStore`

创建同步存储实例。

### `createStorage(options)` → `AsyncStore`

创建异步存储实例（所有方法返回 Promise）。

**两者返回的 Store 接口一致：**

| 方法 | 说明 |
|------|------|
| `get<T>(key, defaultValue?)` | 读取值，支持泛型和默认值 |
| `set<T>(key, value)` | 写入值，传 `null`/`undefined` 等同删除 |
| `has(key)` | 判断 key 是否存在（未过期） |
| `remove(key)` | 删除指定 key |
| `keys(subPrefix?)` | 获取当前 prefix 下的所有 key，可按子前缀过滤 |
| `clear(options?)` | 清空当前 prefix 下的所有 key，支持排除指定 key |

**属性：**

| 属性 | 类型 | 说明 |
|------|------|------|
| `kind` | `string` | 存储后端类型 |
| `prefix` | `string` | 当前实例的键前缀 |

## Options 配置

```typescript
interface BaseStorageOptions {
  kind: StorageKind              // 存储后端类型（见下表）
  prefix: string                 // 键前缀，用于命名空间隔离
  encryptionSecret?: string | string[]  // 加密密钥，不传则不加密
  defaultTTLSeconds?: number     // 默认过期时间（秒）
  codec?: Codec                  // 自定义序列化器，默认 JSON
  driverOptions?: unknown        // 传递给底层驱动的配置
  driver?: SyncDriver | AsyncDriver  // 自定义驱动实例
}
```

## 存储后端

| kind | 类型 | 同步 | 异步 | 环境 | 说明 |
|------|------|:----:|:----:|------|------|
| `'memory'` | `SyncStorageKind` | ✅ | ✅ | 全平台 | 基于 Map 的内存存储，进程退出即丢失 |
| `'local'` | `SyncStorageKind` | ✅ | ✅ | 浏览器 | localStorage，约 5MB 限制 |
| `'session'` | `SyncStorageKind` | ✅ | ✅ | 浏览器 | sessionStorage，标签页关闭即丢失 |
| `'cookie'` | `SyncStorageKind` | ✅ | ✅ | 浏览器 | document.cookie，约 4KB/条 限制 |
| `'electron'` | `SyncStorageKind` | ✅ | ✅ | Electron 主进程 | electron-store，文件系统持久化 |
| `'localforage'` | `StorageKind` | ❌ | ✅ | 浏览器 | IndexedDB/WebSQL，大容量异步存储 |
| `'custom'` | 两者 | ✅ | ✅ | 全平台 | 自定义 driver |

> **注意：** `'localforage'` 仅支持异步 API，不适用于 `createStorageSync`。

## 使用示例

### 前缀隔离

不同 prefix 的 store 实例完全独立，互不影响：

```typescript
const userStore = createStorageSync({ kind: 'memory', prefix: 'user' })
const appStore = createStorageSync({ kind: 'memory', prefix: 'app' })

userStore.set('name', 'Alice')
appStore.set('name', 'MyApp')

userStore.get('name') // => 'Alice'
appStore.get('name')  // => 'MyApp'
```

### TTL 过期

设置 `defaultTTLSeconds` 后，所有数据在指定秒数后自动过期（读取时检测并清理）：

```typescript
const store = createStorageSync({
  kind: 'memory',
  prefix: 'cache',
  defaultTTLSeconds: 60, // 60 秒后过期
})

store.set('temp', 'value')
// ... 60 秒后
store.get('temp') // => undefined（已过期，自动清理）
```

### SM4 加密

传入 `encryptionSecret` 即可启用国密 SM4 加密，对外仍返回明文：

```typescript
const store = createStorageSync({
  kind: 'memory',
  prefix: 'secure',
  encryptionSecret: 'my-secret-key',
})

store.set('password', 'hunter2')
store.get('password') // => 'hunter2'（自动解密）
// 底层存储的是 SM4 加密后的密文
```

**多段密钥拼接：**

```typescript
const store = createStorageSync({
  kind: 'memory',
  prefix: 'secure',
  encryptionSecret: ['userId-123', 'appId-abc', 'device-xyz'],
  // 内部自动拼接为 'userId-123appId-abcdevice-xyz' 后派生密钥
})
```

### 清空数据（排除指定 key）

```typescript
const store = createStorageSync({ kind: 'memory', prefix: 'app' })

store.set('token', 'abc')
store.set('theme', 'dark')
store.set('temp', 'x')

// 清空但保留 token 和 theme
store.clear({ excludeKeys: ['token', 'theme'] })

store.get('token') // => 'abc'（保留）
store.get('theme') // => 'dark'（保留）
store.get('temp')  // => undefined（已清除）
```

### 子前缀查询

```typescript
store.set('user.name', 'Alice')
store.set('user.age', 30)
store.set('app.version', '1.0')

store.keys('user') // => ['user.name', 'user.age']
```

### Electron 主进程

```typescript
// 通过 @qs-coder/storage/electron 导入（生产环境使用字节码）
const { createStorageSync } = require('@qs-coder/storage/electron')

const store = createStorageSync({
  kind: 'electron',
  prefix: 'config',
  driverOptions: { name: 'app-config' },  // electron-store 配置
})

store.set('windowBounds', { x: 100, y: 100, width: 800, height: 600 })
const bounds = store.get('windowBounds')
```

### 浏览器 localStorage

```typescript
const store = createStorageSync({
  kind: 'local',
  prefix: 'web-app',
})

store.set('settings', { lang: 'zh-CN', theme: 'dark' })
const settings = store.get<{ lang: string; theme: string }>('settings')
```

### IndexedDB（异步大容量存储）

```typescript
const store = createStorage({
  kind: 'localforage',
  prefix: 'large-data',
  driverOptions: {
    name: 'my-app',
    storeName: 'files',
  },
})

await store.set('bigBlob', largeData)
const data = await store.get('bigBlob')
```

### 自定义驱动

实现 `SyncDriver` 或 `AsyncDriver` 接口即可：

```typescript
import type { SyncDriver } from '@qs-coder/storage'

class RedisDriver implements SyncDriver {
  kind = 'custom' as const
  private client: RedisClient

  constructor(client: RedisClient) {
    this.client = client
  }

  get(key: string): string | undefined {
    return this.client.get(key) ?? undefined
  }

  set(key: string, value: string | null | undefined): void {
    if (value == null) { this.client.del(key) }
    else { this.client.set(key, value) }
  }

  remove(key: string): void {
    this.client.del(key)
  }

  keys(prefix?: string): string[] {
    return this.client.keys(`${prefix ?? ''}*`)
  }
}

const store = createStorageSync({
  kind: 'custom',
  prefix: 'cache',
  driver: new RedisDriver(myRedisClient),
})
```

## 密钥工具

### `assembleStorageSecret(...parts)` → `string`

从多个来源组装密钥，过滤空值后拼接：

```typescript
import { assembleStorageSecret } from '@qs-coder/storage'

const secret = assembleStorageSecret(userId, appId, deviceId, null, '')
// => 'userId123appId456device789'
```

### `obfuscateSecret(plain)` → `string`

混淆密钥，生成 `__im_obf:` 前缀的混淆串，可安全写入配置文件或日志：

```typescript
import { obfuscateSecret, deobfuscateSecret } from '@qs-coder/storage'

const obf = obfuscateSecret('my-plain-key')
// => '__im_obf:xxxxxxx...'

const plain = deobfuscateSecret(obf)
// => 'my-plain-key'
```

### `normalizeEncryptionSecret(input)` → `string | undefined`

归一化加密密钥：`string[]` 自动拼接，空值返回 `undefined`。

```typescript
normalizeEncryptionSecret(['a', 'b']) // => 'ab'
normalizeEncryptionSecret('hello')     // => 'hello'
normalizeEncryptionSecret(undefined)   // => undefined
```

## 自定义序列化

默认使用 JSON 序列化。可通过 `codec` 选项替换：

```typescript
import type { Codec } from '@qs-coder/storage'

const MsgpackCodec: Codec = {
  serialize: (value) => msgpack.encode(value).toString('base64'),
  deserialize: (input) => msgpack.decode(Buffer.from(input, 'base64')),
}

const store = createStorageSync({
  kind: 'memory',
  prefix: 'msgpack',
  codec: MsgpackCodec,
})
```

## 数据流

```
用户值 (any)
    │
    ▼  wrap in StoredEntry { value, expiresAt? }
    │
    ▼  Codec.serialize → JSON string
    │
    ▼  Encryptor.encrypt → SM4 cipher string (可选)
    │
    ▼  Driver.set → 底层存储 (localStorage / electron-store / ...)
```

读取时逆序：Driver.get → Decrypt → Deserialize → 返回 value。

## 导入路径

| 路径 | 用途 |
|------|------|
| `@qs-coder/storage` | 通用导入（ESM + CJS） |
| `@qs-coder/storage/electron` | Electron 主进程（字节码优先，无字节码时回退 JS） |

## 构建

```bash
pnpm build          # rollup 构建 + electron loader
pnpm build:types    # 生成 .d.ts 类型声明
pnpm build:bytecode # 编译 electron 字节码（需在目标平台 CI 执行）
pnpm test           # 运行 vitest 测试
```

## 测试

```bash
pnpm test           # 运行测试
pnpm vitest run     # 单次运行
```

当前测试覆盖 65 个用例，涵盖 core / secret / encryption / sync-store / async-store 五个模块。

## 类型参考

```typescript
// 存储后端类型
type StorageKind = 'local' | 'session' | 'memory' | 'localforage' | 'electron' | 'cookie' | 'custom'
type SyncStorageKind = 'local' | 'session' | 'memory' | 'electron' | 'cookie' | 'custom'

// 同步存储实例
interface SyncStore {
  readonly kind: SyncStorageKind
  readonly prefix: string
  get<T>(key: string, defaultValue?: T): T | undefined
  set<T>(key: string, value: T | null | undefined): void
  has(key: string): boolean
  remove(key: string): void
  keys(subPrefix?: string): string[]
  clear(options?: { excludeKeys?: string[] } | string[]): void
}

// 异步存储实例
interface AsyncStore {
  readonly kind: StorageKind
  readonly prefix: string
  get<T>(key: string, defaultValue?: T): Promise<T | undefined>
  set<T>(key: string, value: T | null | undefined): Promise<void>
  has(key: string): Promise<boolean>
  remove(key: string): Promise<void>
  keys(subPrefix?: string): Promise<string[]>
  clear(options?: { excludeKeys?: string[] } | string[]): Promise<void>
}
```
