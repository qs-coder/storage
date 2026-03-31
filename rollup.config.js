import { createRequire } from 'node:module'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import clear from 'rollup-plugin-clear'
import typescript from 'rollup-plugin-typescript2'
import json from '@rollup/plugin-json'
import { terser } from 'rollup-plugin-terser'

const require = createRequire(import.meta.url)
const pkg = require('./package.json')

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: false,
      },
      {
        file: 'dist/index.cjs',
        format: 'cjs',
        sourcemap: false,
      },
    ],
    plugins: [
      clear({ targets: ['dist'], watch: false }),
      resolve(),
      commonjs(),
      json(),
      typescript({
        useTsconfigDeclarationDir: true,
        clean: true,
        check: false,
      }),
      terser(),
    ],
    external: [
      ...Object.keys(pkg.dependencies || {}),
    ],
  },
]
