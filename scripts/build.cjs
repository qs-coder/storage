'use strict'

const { run } = require('./encrypt.cjs')

async function build() {
  try {
    await run()
  }
  catch (error) {
    console.error('[im-storage] electron 构建失败:', error)
    process.exit(1)
  }
}

build()

