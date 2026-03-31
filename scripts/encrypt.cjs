'use strict'

const path = require('node:path')
const fs = require('node:fs')
const bytenode = require('bytenode')

const { target, useBytecode } = require('./config.cjs')

async function run() {
  if (!useBytecode()) {
    console.log('[im-storage] encrypt: mode 非 bytecode，跳过')
    return
  }

  const input = target.encrypt.input
  const outputDir = target.encrypt.outputDir
  const outputJsc = path.join(outputDir, 'index.jsc')
  const outputLoader = path.join(outputDir, 'index.cjs')

  if (!fs.existsSync(input)) {
    console.warn('[im-storage] encrypt: dist/index.cjs 不存在，请先运行 rollup 构建')
    return
  }

  fs.mkdirSync(outputDir, { recursive: true })

  await bytenode.compileFile({
    filename: input,
    output: outputJsc,
    electron: true,
  })

  const loaderCode = `/* 自动生成：Electron 主进程入口（字节码优先，开发阶段回退到 JS） */
'use strict'

let impl

try {
  require('bytenode')
  impl = require('./index.jsc')
}
catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[im-storage] 加载字节码失败，回退到 JS：', e && e.message)
  }
  impl = require('../index.cjs')
}

module.exports = impl
`

  fs.writeFileSync(outputLoader, loaderCode, 'utf8')
  console.log('[im-storage] electron 字节码构建完成：', outputJsc)
}

module.exports = { run }

