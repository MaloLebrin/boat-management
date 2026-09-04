import { test } from '@japa/runner'
import type { FeaturePageProps, HelpPageProps } from '../../../shared/types/marketing.js'

/**
 * Pages fonctionnalité dédiées + page Aide & support (refonte marketing
 * 2026-09) : chaque URL localisée rend le bon composant, avec une copie
 * entièrement résolue (aucune clé i18n brute) et, pour l'aide, des montants
 * ICU interpolés (pricingCopyParams) — jamais un placeholder rendu tel quel.
 */

const FEATURE_URLS = {
  maintenance: { fr: '/fr/carnet-entretien-bateau', en: '/en/boat-maintenance-log' },
  fleet: { fr: '/fr/gestion-flotte-bateaux', en: '/en/boat-fleet-management' },
  aiAssistant: { fr: '/fr/assistant-ia-bateau', en: '/en/ai-boat-assistant' },
} as const

const HELP_URLS = { fr: '/fr/aide', en: '/en/help' } as const

test.group('Pages fonctionnalité dédiées', () => {
  for (const [featureKey, urls] of Object.entries(FEATURE_URLS)) {
    for (const locale of ['fr', 'en'] as const) {
      test(`[${locale}] ${featureKey} rend marketing/feature avec une copie résolue`, async ({
        client,
        assert,
      }) => {
        const response = await client.get(urls[locale]).withInertia()

        response.assertStatus(200)
        assert.equal(response.body().component, 'marketing/feature')

        const props = response.body().props as unknown as FeaturePageProps
        assert.equal(props.featureKey, featureKey)
        assert.isNotEmpty(props.t.meta.title)
        assert.isNotEmpty(props.t.meta.description)
        assert.lengthOf(props.t.blocks, 3)
        assert.lengthOf(props.t.faq.items, 4)

        // Aucune clé de traduction non résolue nulle part dans les props.
        const serialized = JSON.stringify(props.t)
        assert.notInclude(serialized, 'marketing.features')

        // Le CTA secondaire du hero cible une URL de la locale courante.
        assert.include(props.t.hero.secondaryCta.href, `/${locale}/`)
      })
    }
  }
})

test.group('Page Aide & support', () => {
  for (const locale of ['fr', 'en'] as const) {
    test(`[${locale}] rend marketing/help avec FAQ agrégée et montants résolus`, async ({
      client,
      assert,
    }) => {
      const response = await client.get(HELP_URLS[locale]).withInertia()

      response.assertStatus(200)
      assert.equal(response.body().component, 'marketing/help')

      const props = response.body().props as unknown as HelpPageProps
      assert.isNotEmpty(props.t.meta.title)
      assert.lengthOf(props.t.channels, 3)
      assert.lengthOf(props.t.faq.groups, 3)
      assert.lengthOf(props.t.resources.items, 4)

      const serialized = JSON.stringify(props.t)
      // Aucune clé de traduction non résolue.
      assert.notInclude(serialized, 'marketing.help')
      assert.notInclude(serialized, 'marketing.features')
      // Les patrons ICU de la FAQ tarifaire sont interpolés (#505, #612).
      assert.notInclude(serialized, '{proMonthly}')
      assert.notInclude(serialized, '{fleetTotal}')
      assert.notInclude(serialized, '{fleetBoats}')
    })
  }
})
