'use strict'

const path = require('node:path')
const fs = require('node:fs')

const { target } = require('./config.cjs')

/**
 * 本地 build 只生成 electron loader（不含 .jsc），
 * .jsc 字节码由 CI 在目标平台上通过 build:bytecode 生成。
 */
function build() {
  const outputDir = target.encrypt.outputDir
  const outputLoader = path.join(outputDir, 'index.cjs')

  fs.mkdirSync(outputDir, { recursive: true })

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
  console.log('[im-storage] electron loader 已生成：', outputLoader)
}

build()

