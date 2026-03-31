import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      // electron-store 在测试环境中不可用，mock 为空模块
      'electron-store': new URL('./test/__mocks__/electron-store.js', import.meta.url).pathname,
    },
  },
})
