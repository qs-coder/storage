'use strict'

const { run } = require('./encrypt.cjs')

async function build() {
  try {
    await run()
  }
  catch (error) {
    console.warn('[im-storage] electron 构建跳过:', error.message || error)
  }
}

build()

