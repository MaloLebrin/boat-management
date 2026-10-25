import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import { marketingPath } from '#shared/helpers/locale_path'
import type { MarketingPage } from '#shared/helpers/locale_path'
import { TELEMETRY_SAMPLE_RETENTION_DAYS } from '#shared/constants/data_retention'
import {
  BUILTIN_ALERT_RULES,
  INSTRUMENT_ALERT_MAX_RULES_PER_BOAT,
} from '#shared/constants/instrument_alerts'
import {
  INSTRUMENTS_MARKETING_BENEFIT_COUNT,
  INSTRUMENTS_MARKETING_CATEGORY_COUNT,
  INSTRUMENTS_MARKETING_FAQ_COUNT,
  INSTRUMENTS_MARKETING_SECURITY_COUNT,
} from '#shared/types/marketing_instruments'
import type { InstrumentsMarketingContentProps } from '#shared/types/marketing_instruments'

interface InstrumentsPageProps {
  locale: 'en' | 'fr'
  content: InstrumentsMarketingContentProps
}

/** Longueur au-delà de laquelle Google tronque un titre / une description dans les SERP. */
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

const KEYWORD: Record<'fr' | 'en', RegExp> = { fr: /instruments/i, en: /instruments/i }

/**
 * SEO de la page « Instruments de bord connectés » (#995) — même traitement que
 * le diagnostic et les pièces IA : contenu éditorial servi par
 * `MarketingInstrumentsContentService`, meta à mot-clé sans la marque.
 */
test.group('Instruments connectés — contenu SEO (#995)', () => {
  for (const locale of ['fr', 'en'] as const) {
    test(`[${locale}] le titre SEO porte le mot-clé, sans la marque, sous ${TITLE_MAX_LENGTH} caractères`, async ({
      client,
      assert,
    }) => {
      const { content } = await fetchProps<InstrumentsPageProps>(
        client,
        marketingPath('instruments', locale)
      )

      assert.match(content.meta.title, KEYWORD[locale])
      assert.match(content.meta.title, /Signal K/)
      // La marque est ajoutée par le template de titre (client ET SSR).
      assert.notInclude(content.meta.title, 'FleetAi')
      assert.isAtMost(content.meta.title.length, TITLE_MAX_LENGTH)
      assert.match(content.meta.description, /Signal K/)
      assert.isAtMost(content.meta.description.length, DESCRIPTION_MAX_LENGTH)
    })

    test(`[${locale}] la page sert héros, étapes, catégories, bénéfices, compatibilité, installation, sécurité, FAQ`, async ({
      client,
      assert,
    }) => {
      const props = await fetchProps<InstrumentsPageProps>(
        client,
        marketingPath('instruments', locale)
      )
      const { content } = props

      assert.equal(props.locale, locale)
      assert.lengthOf(content.steps.items, 3)
      assert.lengthOf(content.categories.items, INSTRUMENTS_MARKETING_CATEGORY_COUNT)
      assert.lengthOf(content.benefits.items, INSTRUMENTS_MARKETING_BENEFIT_COUNT)
      assert.lengthOf(content.alerts.items, BUILTIN_ALERT_RULES.length)
      assert.lengthOf(content.compatibility.supported, 3)
      assert.lengthOf(content.compatibility.unsupported, 3)
      assert.lengthOf(content.install.items, 3)
      assert.lengthOf(content.security.items, INSTRUMENTS_MARKETING_SECURITY_COUNT)
      assert.lengthOf(content.faq.items, INSTRUMENTS_MARKETING_FAQ_COUNT)
      assert.equal(content.hero.primaryCta.href, '/signup?from=instruments')
      assert.equal(content.hero.secondaryCta.href, marketingPath('pricing', locale))
      assert.equal(content.finalCta.primaryCta.href, '/signup?from=instruments')
      assert.equal(content.finalCta.secondaryCta.href, marketingPath('pricing', locale))
      assert.equal(content.install.helpCta.href, marketingPath('help', locale))
    })

    test(`[${locale}] aucune clé brute, aucun placeholder, aucun identifiant Signal K`, async ({
      client,
      assert,
    }) => {
      const { content } = await fetchProps<InstrumentsPageProps>(
        client,
        marketingPath('instruments', locale)
      )

      for (const value of collectStrings(content)) {
        assert.isNotEmpty(value)
        // Clé de traduction non résolue ou placeholder ICU rendu tel quel.
        assert.notInclude(value, 'marketing.features.')
        assert.notInclude(value, '{proDays}')
        assert.notInclude(value, '{enterpriseDays}')
        // Chemins en langage utilisateur, jamais les identifiants Signal K.
        assert.notMatch(value, /propulsion\.|navigation\.|electrical\.|environment\./)
      }
    })

    test(`[${locale}] la sécurité cite les durées de conservation réelles`, async ({
      client,
      assert,
    }) => {
      const { content } = await fetchProps<InstrumentsPageProps>(
        client,
        marketingPath('instruments', locale)
      )
      const retention = content.security.items.find((item) =>
        item.description.includes(String(TELEMETRY_SAMPLE_RETENTION_DAYS.enterprise))
      )

      assert.isDefined(retention, 'aucune carte de sécurité ne cite la conservation Entreprise')
      assert.include(retention!.description, String(TELEMETRY_SAMPLE_RETENTION_DAYS.pro))
    })

    test(`[${locale}] chaque carte porte un pictogramme et les alertes citent les seuils réels`, async ({
      client,
      assert,
    }) => {
      const { content } = await fetchProps<InstrumentsPageProps>(
        client,
        marketingPath('instruments', locale)
      )
      const cards = [
        ...content.categories.items,
        ...content.benefits.items,
        ...content.install.items,
        ...content.security.items,
      ]

      for (const card of cards) assert.isDefined(card.icon, `pas d'icône pour « ${card.title} »`)
      assert.deepEqual(
        content.alerts.items.map((item) => item.severity),
        BUILTIN_ALERT_RULES.map((rule) => rule.severity)
      )
      assert.include(content.alerts.items[0].description, '20')
      assert.include(content.alerts.items[1].description, '95')
      assert.include(content.alerts.customDescription, String(INSTRUMENT_ALERT_MAX_RULES_PER_BOAT))
      for (const item of content.alerts.items) {
        assert.notMatch(item.description, /\{[a-zA-Z]+\}/)
        assert.isNotEmpty(item.severityLabel)
      }
    })

    test(`[${locale}] la FAQ iPhone ne promet rien que le spike n'a pas validé`, async ({
      client,
      assert,
    }) => {
      const { content } = await fetchProps<InstrumentsPageProps>(
        client,
        marketingPath('instruments', locale)
      )
      const answers = content.faq.items.map((item) => item.a).join(' ')

      assert.match(answers, locale === 'fr' ? /pas encore validé/i : /not yet validated/i)
    })

    test(`[${locale}] le maillage interne pointe vers les pages marketing de la locale`, async ({
      client,
      assert,
    }) => {
      const { content } = await fetchProps<InstrumentsPageProps>(
        client,
        marketingPath('instruments', locale)
      )
      const expected: MarketingPage[] = ['maintenance', 'fleet', 'aiAssistant']

      assert.deepEqual(
        content.crossLinks.items.map((item) => item.href),
        expected.map((page) => marketingPath(page, locale))
      )
    })

    test(`[${locale}] la home et la page tarifs renvoient vers la page instruments`, async ({
      client,
      assert,
    }) => {
      const home = await fetchProps<{
        t: { home: { features: Array<{ title: string }> } }
      }>(client, marketingPath('home', locale))
      const pricing = await fetchProps<{
        t: { pricing: { faq: { items: Array<{ q: string; a: string }> } } }
      }>(client, marketingPath('pricing', locale))

      assert.lengthOf(home.t.home.features, 4)
      assert.isNotEmpty(home.t.home.features[3].title)
      assert.isTrue(
        pricing.t.pricing.faq.items.some((item) => /instruments/i.test(item.q)),
        'la FAQ tarifs ne répond pas à « faut-il le plan Pro pour les instruments »'
      )
    })
  }
})
