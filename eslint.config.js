import { configApp } from '@adonisjs/eslint-config'

export default [
  ...configApp(),
  {
    files: ['**/*.vue'],
    rules: {
      'max-lines': ['warn', { max: 250, skipBlankLines: true, skipComments: true }],
    },
  },
]
