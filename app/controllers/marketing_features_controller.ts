import type { HttpContext } from '@adonisjs/core/http'
import { marketingPath, toAppLocale } from '#shared/helpers/locale_path'
import type { MarketingPage } from '#shared/helpers/locale_path'
import type {
  FeatureMockType,
  FeaturePageKey,
  FeaturePageProps,
} from '../../shared/types/marketing.js'

interface MarketingI18n {
  t: (key: string, params?: Record<string, string>) => string
  locale: string
}

/**
 * Mocks produit (`HomeMock*`) affichés sur chaque page fonctionnalité : un dans
 * le hero, un par bloc bénéfice. Réutilise les captures simulées de la home
 * pour croiser les vues produit sans nouveau composant.
 */
const FEATURE_MOCKS: Record<
  FeaturePageKey,
  { hero: FeatureMockType; blocks: [FeatureMockType, FeatureMockType, FeatureMockType] }
> = {
  maintenance: { hero: 'boatDetail', blocks: ['planning', 'upcomingTasks', 'dashboard'] },
  fleet: { hero: 'dashboard', blocks: ['planning', 'boatDetail', 'upcomingTasks'] },
  aiAssistant: { hero: 'fleetide', blocks: ['boatDetail', 'upcomingTasks', 'fleetide'] },
}

/**
 * Cible du CTA secondaire du hero : les pages maintenance/flotte poussent le
 * simulateur de coût (lead magnet), la page assistant pousse le diagnostic IA
 * gratuit — l'outil le plus proche de la promesse de la page.
 */
const FEATURE_HERO_SECONDARY: Record<FeaturePageKey, MarketingPage> = {
  maintenance: 'simulator',
  fleet: 'simulator',
  aiAssistant: 'diagnosisAi',
}

/** Cartes de maillage interne : clé de copie `features.shared.cards.*` + page cible. */
const FEATURE_CROSS_LINKS: Record<FeaturePageKey, Array<{ card: string; page: MarketingPage }>> = {
  maintenance: [
    { card: 'fleet', page: 'fleet' },
    { card: 'aiAssistant', page: 'aiAssistant' },
    { card: 'simulator', page: 'simulator' },
  ],
  fleet: [
    { card: 'maintenance', page: 'maintenance' },
    { card: 'aiAssistant', page: 'aiAssistant' },
    { card: 'simulator', page: 'simulator' },
  ],
  aiAssistant: [
    { card: 'diagnosis', page: 'diagnosisAi' },
    { card: 'parts', page: 'partsAi' },
    { card: 'maintenance', page: 'maintenance' },
  ],
}

export default class MarketingFeaturesController {
  async maintenance({ inertia, i18n }: HttpContext) {
    return inertia.render('marketing/feature', this.buildFeaturePageData(i18n, 'maintenance'))
  }

  async fleet({ inertia, i18n }: HttpContext) {
    return inertia.render('marketing/feature', this.buildFeaturePageData(i18n, 'fleet'))
  }

  async aiAssistant({ inertia, i18n }: HttpContext) {
    return inertia.render('marketing/feature', this.buildFeaturePageData(i18n, 'aiAssistant'))
  }

  private buildFeaturePageData(i18n: MarketingI18n, feature: FeaturePageKey): FeaturePageProps {
    const locale = toAppLocale(i18n.locale)
    const t = (key: string, params?: Record<string, string>) =>
      i18n.t(`marketing.features.${feature}.${key}`, params)
    const shared = (key: string) => i18n.t(`marketing.features.shared.${key}`)

    const mocks = FEATURE_MOCKS[feature]

    return {
      featureKey: feature,
      t: {
        meta: {
          title: t('meta_title'),
          description: t('meta_description'),
        },
        hero: {
          eyebrow: t('hero_eyebrow'),
          title: t('hero_title'),
          titleHighlight: t('hero_title_highlight'),
          subtitle: t('hero_subtitle'),
          primaryCta: { label: shared('cta_primary'), href: '/signup' },
          secondaryCta: {
            label: t('hero_secondary_label'),
            href: marketingPath(FEATURE_HERO_SECONDARY[feature], locale),
          },
          reassurance: shared('reassurance'),
          mockType: mocks.hero,
        },
        blocks: mocks.blocks.map((mockType, index) => {
          const n = index + 1
          return {
            eyebrow: t(`block${n}_eyebrow`),
            title: t(`block${n}_title`),
            titleHighlight: t(`block${n}_highlight`),
            body: t(`block${n}_body`),
            bullets: [
              t(`block${n}_bullet1`),
              t(`block${n}_bullet2`),
              t(`block${n}_bullet3`),
              t(`block${n}_bullet4`),
            ],
            mockType,
          }
        }),
        steps: {
          eyebrow: shared('steps_eyebrow'),
          title: t('steps_title'),
          subtitle: t('steps_subtitle'),
          items: [1, 2, 3].map((n) => ({
            step: String(n),
            title: t(`step${n}_title`),
            description: t(`step${n}_desc`),
          })),
        },
        proof: {
          stats: [1, 2, 3].map((n) => ({
            value: t(`stat${n}_value`),
            label: t(`stat${n}_label`),
          })),
          quote: {
            text: t('quote_text'),
            author: t('quote_author'),
            role: t('quote_role'),
          },
        },
        crossLinks: {
          eyebrow: shared('cross_eyebrow'),
          title: shared('cross_title'),
          linkLabel: shared('cross_link_label'),
          items: FEATURE_CROSS_LINKS[feature].map(({ card, page }) => ({
            title: i18n.t(`marketing.features.shared.cards.${card}_title`),
            description: i18n.t(`marketing.features.shared.cards.${card}_desc`),
            href: marketingPath(page, locale),
          })),
        },
        faq: {
          eyebrow: shared('faq_eyebrow'),
          title: t('faq_title'),
          titleHighlight: t('faq_title_highlight'),
          items: [1, 2, 3, 4].map((n) => ({
            q: t(`faq_q${n}`),
            a: t(`faq_a${n}`),
          })),
        },
        finalCta: {
          title: t('final_title'),
          titleHighlight: t('final_highlight'),
          subtitle: t('final_subtitle'),
          primaryCta: { label: shared('final_primary'), href: '/signup' },
          secondaryCta: {
            label: shared('final_secondary'),
            href: marketingPath('pricing', locale),
          },
        },
      },
    }
  }
}
