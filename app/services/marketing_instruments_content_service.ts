import { marketingPath, toAppLocale } from '#shared/helpers/locale_path'
import type { MarketingPage } from '#shared/helpers/locale_path'
import { TELEMETRY_SAMPLE_RETENTION_DAYS } from '#shared/constants/data_retention'
import type { MarketingI18n } from '#shared/types/marketing'
import {
  INSTRUMENTS_MARKETING_BENEFIT_COUNT,
  INSTRUMENTS_MARKETING_CATEGORY_COUNT,
  INSTRUMENTS_MARKETING_FAQ_COUNT,
  INSTRUMENTS_MARKETING_SECURITY_COUNT,
} from '#shared/types/marketing_instruments'
import type {
  InstrumentsMarketingCardsSection,
  InstrumentsMarketingContentProps,
} from '#shared/types/marketing_instruments'

/** Cartes de maillage interne : clé de copie `features.shared.cards.*` + page cible. */
const CROSS_LINKS: ReadonlyArray<{ card: string; page: MarketingPage }> = [
  { card: 'maintenance', page: 'maintenance' },
  { card: 'fleet', page: 'fleet' },
  { card: 'aiAssistant', page: 'aiAssistant' },
]

const STEP_COUNT = 3
const INSTALL_COUNT = 3
const COMPAT_COUNT = 3

/**
 * Contenu éditorial de la page « Instruments de bord connectés » (#995) —
 * jumeau de `PublicPartSearchContentService`.
 *
 * La copie vient de `marketing.features.instruments.*` (tutoiement marketing)
 * et des libellés partagés `marketing.features.shared.*`. Les durées de
 * conservation citées sont lues dans `TELEMETRY_SAMPLE_RETENTION_DAYS` : jamais
 * un nombre recopié dans le JSON, qui dériverait de la purge réelle.
 */
export default class MarketingInstrumentsContentService {
  build(i18n: MarketingI18n): InstrumentsMarketingContentProps {
    const locale = toAppLocale(i18n.locale)
    const params = {
      proDays: String(TELEMETRY_SAMPLE_RETENTION_DAYS.pro),
      enterpriseDays: String(TELEMETRY_SAMPLE_RETENTION_DAYS.enterprise),
    }
    const t = (key: string) => i18n.t(`marketing.features.instruments.${key}`, params)
    const shared = (key: string) => i18n.t(`marketing.features.shared.${key}`)

    const cards = (
      section: string,
      prefix: string,
      count: number
    ): InstrumentsMarketingCardsSection => ({
      eyebrow: t(`${section}_eyebrow`),
      title: t(`${section}_title`),
      titleHighlight: t(`${section}_title_highlight`),
      subtitle: t(`${section}_subtitle`),
      items: Array.from({ length: count }, (_, index) => ({
        title: t(`${prefix}${index + 1}_title`),
        description: t(`${prefix}${index + 1}_desc`),
      })),
    })

    return {
      meta: { title: t('meta_title'), description: t('meta_description') },
      hero: {
        eyebrow: t('hero_eyebrow'),
        title: t('hero_title'),
        titleHighlight: t('hero_title_highlight'),
        subtitle: t('hero_subtitle'),
        primaryCta: { label: shared('cta_primary'), href: '/signup?from=instruments' },
        secondaryCta: {
          label: t('hero_secondary_label'),
          href: marketingPath('pricing', locale),
        },
        reassurance: t('hero_reassurance'),
      },
      steps: {
        eyebrow: shared('steps_eyebrow'),
        title: t('steps_title'),
        subtitle: t('steps_subtitle'),
        items: Array.from({ length: STEP_COUNT }, (_, index) => ({
          step: String(index + 1),
          title: t(`step${index + 1}_title`),
          description: t(`step${index + 1}_desc`),
        })),
      },
      categories: cards('categories', 'cat', INSTRUMENTS_MARKETING_CATEGORY_COUNT),
      benefits: cards('benefits', 'benefit', INSTRUMENTS_MARKETING_BENEFIT_COUNT),
      compatibility: {
        eyebrow: t('compat_eyebrow'),
        title: t('compat_title'),
        titleHighlight: t('compat_title_highlight'),
        subtitle: t('compat_subtitle'),
        supportedTitle: t('compat_supported_title'),
        supported: Array.from({ length: COMPAT_COUNT }, (_, index) =>
          t(`compat_supported${index + 1}`)
        ),
        unsupportedTitle: t('compat_unsupported_title'),
        unsupported: Array.from({ length: COMPAT_COUNT }, (_, index) =>
          t(`compat_unsupported${index + 1}`)
        ),
        planNote: t('compat_plan_note'),
      },
      install: {
        ...cards('install', 'install', INSTALL_COUNT),
        helpCta: { label: t('install_help_label'), href: marketingPath('help', locale) },
      },
      security: cards('security', 'security', INSTRUMENTS_MARKETING_SECURITY_COUNT),
      crossLinks: {
        eyebrow: shared('cross_eyebrow'),
        title: shared('cross_title'),
        linkLabel: shared('cross_link_label'),
        items: CROSS_LINKS.map(({ card, page }) => ({
          title: shared(`cards.${card}_title`),
          description: shared(`cards.${card}_desc`),
          href: marketingPath(page, locale),
        })),
      },
      faq: {
        eyebrow: shared('faq_eyebrow'),
        title: t('faq_title'),
        titleHighlight: t('faq_title_highlight'),
        items: Array.from({ length: INSTRUMENTS_MARKETING_FAQ_COUNT }, (_, index) => ({
          q: t(`faq_q${index + 1}`),
          a: t(`faq_a${index + 1}`),
        })),
      },
      finalCta: {
        title: t('final_title'),
        titleHighlight: t('final_highlight'),
        subtitle: t('final_subtitle'),
        primaryCta: { label: shared('final_primary'), href: '/signup?from=instruments' },
        secondaryCta: { label: shared('final_secondary'), href: marketingPath('pricing', locale) },
      },
    }
  }
}
