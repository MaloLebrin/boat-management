import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import { marketingPath } from '#shared/helpers/locale_path'
import type { MarketingPage } from '#shared/helpers/locale_path'
import { PUBLIC_DIAGNOSIS_LIFETIME_LIMIT } from '#shared/types/public_diagnosis'
import type { PublicDiagnosisContentProps } from '#shared/types/public_diagnosis'

interface DiagnosisPageProps {
  content: PublicDiagnosisContentProps
}

interface HomeProps {
  t: {
    meta: { title: string; description: string }
    home: {
      hero: {
        announcement: { label: string; href: string }
        content: { loueurs: { title: string; subtitle: string } }
      }
      faq: { items: Array<{ q: string; a: string }> }
    }
  }
}

/** Longueur au-delà de laquelle Google tronque un titre dans les SERP. */
const TITLE_MAX_LENGTH = 60
const DESCRIPTION_MAX_LENGTH = 160

async function fetchProps<T>(client: ApiClient, path: string): Promise<T> {
  const response = await client.get(path).withInertia()
  response.assertStatus(200)
  return response.body().props as T
}

/** Toutes les chaînes d'un objet de props, à plat — pour traquer clés brutes et placeholders. */
function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(collectStrings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectStrings)
  return []
}

const KEYWORD: Record<'fr' | 'en', RegExp> = { fr: /panne/i, en: /engine/i }

/**
 * SEO de la page publique de diagnostic : elle n'avait que le hero et le chat
 * (rien d'indexable), un `<title>` doublé de la marque côté client, et aucune
 * donnée structurée. Ces tests figent le contenu éditorial servi par
 * `PublicDiagnosisContentService` et les meta de la home.
 */
test.group('Diagnostic IA public — contenu SEO', () => {
  for (const locale of ['fr', 'en'] as const) {
    test(`[${locale}] le titre SEO porte le mot-clé, sans la marque, sous ${TITLE_MAX_LENGTH} caractères`, async ({
      client,
      assert,
    }) => {
      const { content } = await fetchProps<DiagnosisPageProps>(
        client,
        marketingPath('diagnosisAi', locale)
      )

      assert.match(content.meta.title, KEYWORD[locale])
      // La marque est ajoutée par le template de titre (client ET SSR) :
      // l'inclure ici la doublerait.
      assert.notInclude(content.meta.title, 'FleetAi')
      assert.isAtMost(content.meta.title.length, TITLE_MAX_LENGTH)
      assert.match(content.meta.description, KEYWORD[locale])
      assert.isAtMost(content.meta.description.length, DESCRIPTION_MAX_LENGTH)
    })

    test(`[${locale}] la page sert étapes, pannes fréquentes, FAQ et CTA final`, async ({
      client,
      assert,
    }) => {
      const { content } = await fetchProps<DiagnosisPageProps>(
        client,
        marketingPath('diagnosisAi', locale)
      )

      assert.lengthOf(content.steps.items, 3)
      assert.lengthOf(content.symptoms.items, 8)
      assert.lengthOf(content.faq.items, 6)
      assert.equal(content.finalCta.primaryCta.href, '/signup?from=diagnostic')
      assert.equal(content.finalCta.secondaryCta.href, marketingPath('pricing', locale))

      for (const value of collectStrings(content)) {
        assert.isNotEmpty(value)
        // Clé de traduction non résolue ou placeholder ICU rendu tel quel.
        assert.notInclude(value, 'publicDiagnosis.')
        assert.notInclude(value, 'marketing.features.')
        assert.notInclude(value, '{count}')
      }
    })

    test(`[${locale}] la FAQ cite le quota réel de diagnostics gratuits`, async ({
      client,
      assert,
    }) => {
      const { content } = await fetchProps<DiagnosisPageProps>(
        client,
        marketingPath('diagnosisAi', locale)
      )
      const answers = content.faq.items.map((item) => item.a)

      assert.isTrue(
        answers.some((a) => a.includes(String(PUBLIC_DIAGNOSIS_LIFETIME_LIMIT))),
        'aucune réponse de la FAQ ne cite le nombre de diagnostics gratuits'
      )
    })

    test(`[${locale}] le maillage interne pointe vers les pages marketing de la locale`, async ({
      client,
      assert,
    }) => {
      const { content } = await fetchProps<DiagnosisPageProps>(
        client,
        marketingPath('diagnosisAi', locale)
      )
      const expected: MarketingPage[] = ['maintenance', 'aiAssistant', 'partsAi', 'simulator']

      assert.deepEqual(
        content.crossLinks.items.map((item) => item.href),
        expected.map((page) => marketingPath(page, locale))
      )
    })
  }
})

test.group('Home — meta SEO et promotion du diagnostic', () => {
  for (const locale of ['fr', 'en'] as const) {
    test(`[${locale}] le titre SEO n'est plus l'accroche du hero et porte les mots-clés`, async ({
      client,
      assert,
    }) => {
      const { t } = await fetchProps<HomeProps>(client, marketingPath('home', locale))

      assert.notEqual(t.meta.title, t.home.hero.content.loueurs.title)
      assert.notEqual(t.meta.description, t.home.hero.content.loueurs.subtitle)
      assert.notInclude(t.meta.title, 'FleetAi')
      assert.isAtMost(t.meta.title.length, TITLE_MAX_LENGTH)
      assert.match(t.meta.title, locale === 'fr' ? /flotte/i : /fleet/i)
      assert.match(t.meta.description, locale === 'fr' ? /diagnostic/i : /diagnosis/i)
    })

    test(`[${locale}] le badge du hero pointe vers le chat public de diagnostic`, async ({
      client,
      assert,
    }) => {
      const { t } = await fetchProps<HomeProps>(client, marketingPath('home', locale))

      assert.equal(t.home.hero.announcement.href, marketingPath('diagnosisAi', locale))
      assert.isNotEmpty(t.home.hero.announcement.label)
      assert.notInclude(t.home.hero.announcement.label, 'marketing.home')
    })

    test(`[${locale}] la FAQ de la home répond à « tester le diagnostic sans compte »`, async ({
      client,
      assert,
    }) => {
      const { t } = await fetchProps<HomeProps>(client, marketingPath('home', locale))
      const pattern = locale === 'fr' ? /diagnostic/i : /diagnosis/i
      const item = t.home.faq.items.find((faq) => pattern.test(faq.q))

      assert.isDefined(item, 'aucune question de la FAQ ne cite le diagnostic')
      assert.include(item!.a, String(PUBLIC_DIAGNOSIS_LIFETIME_LIMIT))
      assert.notInclude(item!.a, '{count}')
    })
  }
})
