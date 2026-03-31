'use strict'

const path = require('node:path')

const root = path.resolve(__dirname, '..')

const target = {
  name: 'electron',
  output: 'dist',
  encrypt: {
    mode: 'bytecode', // bytecode - 字节码加密
    input: path.join(root, 'dist/index.cjs'),
    outputDir: path.join(root, 'dist/electron'),
  },
}

function useBytecode() {
  return ['bytecode', 'strict'].includes(target.encrypt.mode)
}

module.exports = {
  target,
  useBytecode,
}

