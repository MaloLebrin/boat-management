import { configApp } from '@adonisjs/eslint-config'
import prettierConfig from 'eslint-config-prettier'
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
    files: ['inertia/**/*.vue'],
    rules: {
      /**
       * Navigation interne = `<Link>` (#533). Une ancre `<a href="/...">` brute
       * provoque un rechargement complet : bundle re-téléchargé, état client
       * perdu, layout persistant Inertia remonté pour rien.
       *
       * Exceptions légitimes, à marquer par un `eslint-disable-next-line` qui
       * en donne la raison : téléchargement ou export (une visite Inertia
       * afficherait le binaire comme une page) et ouverture en nouvel onglet
       * (`shouldIntercept()` d'Inertia ignore `target`, un `<Link>` ne sait
       * donc pas ouvrir un onglet).
       */
      'vue/no-restricted-static-attribute': [
        'error',
        {
          key: 'href',
          value: '/^\\//',
          element: 'a',
          message:
            'Navigation interne : utiliser <Link> (@adonisjs/inertia/vue) — une ancre brute recharge toute la page. <a> reste correct pour un lien externe, mailto:/tel:, un téléchargement ou un target="_blank" (ajouter alors un eslint-disable-next-line motivé).',
        },
      ],
      'vue/no-restricted-v-bind': [
        'error',
        {
          argument: 'href',
          element: 'a',
          message:
            'Navigation interne : utiliser <Link> (@adonisjs/inertia/vue) — une ancre brute recharge toute la page. <a> reste correct pour un lien externe, mailto:/tel:, un téléchargement ou un target="_blank" (ajouter alors un eslint-disable-next-line motivé).',
        },
      ],
    },
  },
  {
    files: ['inertia/**/*.ts', 'inertia/**/*.vue'],
    rules: {
      '@adonisjs/no-backend-import-in-frontend': [
        'error',
        {
          allowed: [
            '#shared/**',
            '../../shared/**',
            '../../../shared/**',
            '../../../../shared/**',
            '../../../../../shared/**',
            '../../../../../../shared/**',
          ],
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/shared/constants/demo', '#shared/constants/demo'],
              message:
                'shared/constants/demo uses process.env — backend only, never import in inertia/',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['app/**/*.ts'],
    rules: {
      /**
       * Pas de bascule `locale === 'fr'` côté backend (#863) : un texte vu par
       * l'utilisateur passe par `i18n.t()` (clé dans les deux locales), une
       * locale à normaliser par `toAppLocale()` / `isAppLocale()`
       * (`#shared/helpers/locale_path`). Ce motif fermait la porte à une
       * troisième langue et laissait des en-têtes CSV en français pour un
       * utilisateur anglophone.
       *
       * Exception : les fragments de prompt destinés au modèle IA, jamais
       * affichés tels quels — `eslint-disable-next-line` motivé.
       */
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "BinaryExpression[operator=/^[!=]==?$/][right.type='Literal'][right.value='fr'], BinaryExpression[operator=/^[!=]==?$/][left.type='Literal'][left.value='fr']",
          message:
            "Pas de `locale === 'fr'` dans app/ : i18n.t() pour un texte, toAppLocale()/isAppLocale() pour normaliser une locale.",
        },
      ],
    },
  },
  prettierConfig,
]
