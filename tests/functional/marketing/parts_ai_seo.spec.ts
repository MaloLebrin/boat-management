import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import { marketingPath } from '#shared/helpers/locale_path'
import type { MarketingPage } from '#shared/helpers/locale_path'
import { PUBLIC_PART_SEARCH_LIFETIME_LIMIT } from '#shared/types/spare_part_chat'
import type { PublicPartSearchContentProps } from '#shared/types/spare_part_chat'

interface PartsAiPageProps {
  content: PublicPartSearchContentProps
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

const KEYWORD: Record<'fr' | 'en', RegExp> = { fr: /pièce/i, en: /part/i }

/**
 * SEO de la page publique de recherche de références de pièces — même
 * traitement que le diagnostic (`diagnosis_seo.spec.ts`) : contenu éditorial
 * servi par `PublicPartSearchContentService`, meta à mot-clé sans la marque.
 */
test.group('Pièces IA public — contenu SEO', () => {
  for (const locale of ['fr', 'en'] as const) {
    test(`[${locale}] le titre SEO porte le mot-clé, sans la marque, sous ${TITLE_MAX_LENGTH} caractères`, async ({
      client,
      assert,
    }) => {
      const { content } = await fetchProps<PartsAiPageProps>(
        client,
        marketingPath('partsAi', locale)
      )

      assert.match(content.meta.title, KEYWORD[locale])
      // La marque est ajoutée par le template de titre (client ET SSR).
      assert.notInclude(content.meta.title, 'FleetAi')
      assert.isAtMost(content.meta.title.length, TITLE_MAX_LENGTH)
      assert.match(content.meta.description, KEYWORD[locale])
      assert.isAtMost(content.meta.description.length, DESCRIPTION_MAX_LENGTH)
    })

    test(`[${locale}] la page sert étapes, pièces fréquentes, FAQ et CTA final`, async ({
      client,
      assert,
    }) => {
      const { content } = await fetchProps<PartsAiPageProps>(
        client,
        marketingPath('partsAi', locale)
      )

      assert.lengthOf(content.steps.items, 3)
      assert.lengthOf(content.parts.items, 8)
      assert.lengthOf(content.faq.items, 6)
      assert.equal(content.finalCta.primaryCta.href, '/signup?from=parts')
      assert.equal(content.finalCta.secondaryCta.href, marketingPath('pricing', locale))

      for (const value of collectStrings(content)) {
        assert.isNotEmpty(value)
        // Clé de traduction non résolue ou placeholder ICU rendu tel quel.
        assert.notInclude(value, 'publicPartSearch.')
        assert.notInclude(value, 'marketing.features.')
        assert.notInclude(value, '{count}')
      }
    })

    test(`[${locale}] la FAQ cite le quota réel de recherches gratuites`, async ({
      client,
      assert,
    }) => {
      const { content } = await fetchProps<PartsAiPageProps>(
        client,
        marketingPath('partsAi', locale)
      )
      const answers = content.faq.items.map((item) => item.a)

      assert.isTrue(
        answers.some((a) => a.includes(String(PUBLIC_PART_SEARCH_LIFETIME_LIMIT))),
        'aucune réponse de la FAQ ne cite le nombre de recherches gratuites'
      )
    })

    test(`[${locale}] le maillage interne pointe vers les pages marketing de la locale`, async ({
      client,
      assert,
    }) => {
      const { content } = await fetchProps<PartsAiPageProps>(
        client,
        marketingPath('partsAi', locale)
      )
      const expected: MarketingPage[] = ['diagnosisAi', 'maintenance', 'aiAssistant', 'simulator']

      assert.deepEqual(
        content.crossLinks.items.map((item) => item.href),
        expected.map((page) => marketingPath(page, locale))
      )
    })
  }
})
