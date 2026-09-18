import { test } from '@japa/runner'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { APP_LOCALES, marketingPath } from '#shared/helpers/locale_path'
import { readSharedPropKeys } from '#tests/support/inertia_shared_props'
import type { MarketingPage } from '#shared/helpers/locale_path'

/**
 * Photographie des props de chaque page marketing statique, par locale
 * (vague 2.1). Le contrôleur marketing est découpé en services de contenu :
 * ces fixtures garantissent que le contrat de props ne bouge pas d'un octet.
 *
 * Régénérer après un changement de copie **voulu** :
 *   UPDATE_MARKETING_FIXTURES=1 node ace test functional --files=marketing/props_snapshot
 */
const PAGES: MarketingPage[] = [
  'home',
  'pricing',
  'about',
  'contact',
  'guide',
  'help',
  'privacy',
  'terms',
  'salesTerms',
  'legalNotice',
]

/**
 * Props partagées par le middleware Inertia, hors contrat de la page —
 * **dérivées de `share` plutôt que recopiées** (#710).
 *
 * Cette liste était écrite en dur : ajouter une prop partagée dans
 * `InertiaMiddleware.share` faisait tomber les vingt fixtures d'un coup, sans
 * que le diff dise pourquoi. Elle se lit désormais dans le middleware, si bien
 * qu'une prop partagée ajoutée continue d'être écartée ici — et ne produit
 * qu'un seul échec, celui de `tests/unit/hygiene/inertia_shared_props.spec.ts`,
 * qui la nomme et demande si elle a sa place sur les pages publiques.
 */
const SHARED_KEYS = new Set(readSharedPropKeys())

const FIXTURES_DIR = new URL('./__fixtures__/', import.meta.url).pathname
const UPDATE = process.env.UPDATE_MARKETING_FIXTURES === '1'

function pageProps(props: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(props).filter(([key]) => !SHARED_KEYS.has(key)))
}

test.group('Marketing pages — props snapshot (functional)', () => {
  for (const page of PAGES) {
    for (const locale of APP_LOCALES) {
      test(`${page} (${locale}) renders the same props as its fixture`, async ({
        client,
        assert,
      }) => {
        const response = await client.get(marketingPath(page, locale)).withInertia()
        response.assertStatus(200)
        const actual = pageProps(response.body().props as Record<string, unknown>)
        assert.isNotEmpty(actual)

        const file = join(FIXTURES_DIR, `${page}.${locale}.json`)
        if (UPDATE || !existsSync(file)) {
          mkdirSync(FIXTURES_DIR, { recursive: true })
          writeFileSync(file, JSON.stringify(actual, null, 2) + '\n')
        }

        const expected = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
        assert.deepEqual(actual, expected)
      })
    }
  }
})
