import { configApp } from '@adonisjs/eslint-config'
import pluginVue from 'eslint-plugin-vue'

const adonisConfig = configApp()
const tsParser = adonisConfig.find((c) => c.languageOptions?.parser)?.languageOptions?.parser

export default [
  ...adonisConfig,
  ...pluginVue.configs['flat/essential'].map((c) => {
    if (c.languageOptions?.parser?.meta?.name === 'vue-eslint-parser') {
      return {
        ...c,
        languageOptions: {
          ...c.languageOptions,
          parserOptions: { ...c.languageOptions.parserOptions, parser: tsParser },
        },
      }
    }
    return c
  }),
  {
    files: ['**/*.vue'],
    rules: {
      'max-lines': ['warn', { max: 250, skipBlankLines: true, skipComments: true }],
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['inertia/**/*.ts'],
    rules: {
      '@adonisjs/no-backend-import-in-frontend': [
        'error',
        { allowed: ['../../shared/constants/**'] },
      ],
    },
  },
]
