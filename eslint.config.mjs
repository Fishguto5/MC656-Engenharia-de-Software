import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import stylistic from '@stylistic/eslint-plugin'
import js from '@eslint/js'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  js.configs.recommended,
  stylistic.configs.recommended,

  // @typescript-eslint suggest disabling this rule: https://typescript-eslint.io/troubleshooting/faqs/eslint/
  { files: ['**/*.{ts,tsx,mts,cts}'], rules: { 'no-undef': 'off' } },

  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
])

export default eslintConfig
