import { test } from '@japa/runner'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { APP_LOCALES, marketingPath } from '#shared/helpers/locale_path'
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

/** Props partagées par le middleware Inertia, hors contrat de la page. */
const SHARED_KEYS = new Set([
  'errors',
  'locale',
  'theme',
  'appT',
  'path',
  'flash',
  'demoSessionStartedAt',
  'demoSessionDurationMs',
  'user',
  'currentPlan',
  'organizationType',
  'activeModules',
  'activeAddons',
  'branding',
  'notifications',
  'vapidPublicKey',
  'permissions',
  'assistantConversation',
])

const FIXTURES_DIR = new URL('./__fixtures__/', import.meta.url).pathname
const UPDATE = process.env.UPDATE_MARKETING_FIXTURES === '1'

function pageProps(props: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(props).filter(([key]) => !SHARED_KEYS.has(key)))
}

/**
 * Jeton substitué à l'année dans les props que l'horloge fait varier (#709).
 * Choisi identique au placeholder ICU de `marketing.json` pour que la fixture
 * se lise comme sa clé de traduction.
 */
const YEAR_TOKEN = '{year}'
const ANY_YEAR = /\b(?:19|20)\d{2}\b/g

/**
 * Le titre SEO du guide porte l'**année en cours**, interpolée à l'exécution
 * (`MarketingContentService`, `new Date().getFullYear()`). Figée dans une
 * fixture générée en 2026, elle rendrait `guide.fr` et `guide.en` rouges au
 * 1ᵉʳ janvier suivant, sur un dépôt que personne n'a touché (#709).
 *
 * On neutralise donc l'année **des deux côtés** de la comparaison, au seul
 * endroit où l'horloge intervient : `meta.title` de la page guide. Le reste du
 * titre — et toutes les autres props — continue d'être comparé au caractère
 * près. Que l'année interpolée soit bien l'année courante, et non un millésime
 * refigé en dur, reste couvert par `guide_seo.spec.ts`.
 *
 * Les dix autres fixtures qui contiennent « 2026 » ne passent pas ici : leur
 * millésime est un texte éditorial de `marketing.json` (« 9 juillet 2026 »),
 * qui ne bouge que si quelqu'un l'édite — c'est précisément ce qu'un snapshot
 * doit attraper.
 */
function neutralizeClock(page: MarketingPage, props: Record<string, unknown>) {
  if (page !== 'guide') return props

  const meta = props.meta as { title?: unknown } | undefined
  if (typeof meta?.title !== 'string') return props

  return { ...props, meta: { ...meta, title: meta.title.replace(ANY_YEAR, YEAR_TOKEN) } }
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
        const actual = neutralizeClock(
          page,
          pageProps(response.body().props as Record<string, unknown>)
        )
        assert.isNotEmpty(actual)

        const file = join(FIXTURES_DIR, `${page}.${locale}.json`)
        if (UPDATE || !existsSync(file)) {
          mkdirSync(FIXTURES_DIR, { recursive: true })
          writeFileSync(file, JSON.stringify(actual, null, 2) + '\n')
        }

        const expected = neutralizeClock(
          page,
          JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
        )
        assert.deepEqual(actual, expected)
      })
    }
  }
})

/**
 * Preuve que la neutralisation ci-dessus tient : une fixture millésimée d'une
 * **autre** année que celle de la réponse doit continuer de correspondre.
 *
 * C'est l'exact symétrique du scénario redouté (#709) — fixture figée sur un
 * millésime, horloge passée à l'année suivante —, mais joué sans toucher au
 * `Date` global du process, qui casserait Lucid et le client HTTP pour tout le
 * fichier : `neutralizeClock` s'applique des deux côtés, décaler la fixture ou
 * décaler l'horloge produit la même comparaison.
 */
test.group('Marketing pages — le snapshot du guide ne dépend pas de l’année (#709)', () => {
  for (const locale of APP_LOCALES) {
    test(`guide (${locale}) matches a fixture generated in another year`, async ({
      client,
      assert,
    }) => {
      const response = await client.get(marketingPath('guide', locale)).withInertia()
      response.assertStatus(200)

      const raw = pageProps(response.body().props as Record<string, unknown>)

      // La fixture telle qu'elle aurait été générée cinq ans plus tôt : le
      // jeton reprend la forme qu'il remplace, une année en dur dans le titre.
      const staleYear = String(new Date().getFullYear() - 5)
      const stale = JSON.parse(
        readFileSync(join(FIXTURES_DIR, `guide.${locale}.json`), 'utf8').replaceAll(
          YEAR_TOKEN,
          staleYear
        )
      ) as Record<string, unknown>

      assert.deepEqual(neutralizeClock('guide', raw), neutralizeClock('guide', stale))

      // Et la comparaison ne se contente pas de deux objets vidés de leur
      // contenu : sans neutralisation, cette même fixture décalée échoue.
      assert.notDeepEqual(raw, stale)
      assert.include(
        (stale.meta as { title: string }).title,
        staleYear,
        'la fixture décalée doit bien porter l’année décalée'
      )
    })
  }
})
