import { marketingPath, toAppLocale } from '#shared/helpers/locale_path'
import type { MarketingPage } from '#shared/helpers/locale_path'
import type { MarketingI18n } from '#shared/types/marketing'
import { PUBLIC_PART_SEARCH_LIFETIME_LIMIT } from '#shared/types/spare_part_chat'
import type { PublicPartSearchContentProps } from '#shared/types/spare_part_chat'

/** Cartes de maillage interne : clé de copie `features.shared.cards.*` + page cible. */
const CROSS_LINKS: ReadonlyArray<{ card: string; page: MarketingPage }> = [
  { card: 'diagnosis', page: 'diagnosisAi' },
  { card: 'maintenance', page: 'maintenance' },
  { card: 'aiAssistant', page: 'aiAssistant' },
  { card: 'simulator', page: 'simulator' },
]

const PART_COUNT = 8
const FAQ_COUNT = 6

/**
 * Contenu éditorial de la page publique de recherche de références de pièces
 * (#634 Phase 2) — jumeau de `PublicDiagnosisContentService`.
 *
 * La copie est assemblée ici depuis `publicPartSearch.*` (tutoiement
 * marketing) et les libellés partagés `marketing.features.shared.*`, typée
 * dans `shared/types`, figée par les tests Japa. Le quota cité interpole
 * `PUBLIC_PART_SEARCH_LIFETIME_LIMIT` — jamais un nombre recopié dans le JSON.
 */
export default class PublicPartSearchContentService {
  build(i18n: MarketingI18n): PublicPartSearchContentProps {
    const locale = toAppLocale(i18n.locale)
    const quotaParams = { count: String(PUBLIC_PART_SEARCH_LIFETIME_LIMIT) }
    const t = (key: string) => i18n.t(`publicPartSearch.${key}`, quotaParams)
    const shared = (key: string) => i18n.t(`marketing.features.shared.${key}`)

    return {
      meta: {
        title: t('meta_title'),
        description: t('meta_description'),
      },
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
      parts: {
        eyebrow: t('parts_eyebrow'),
        title: t('parts_title'),
        titleHighlight: t('parts_title_highlight'),
        subtitle: t('parts_subtitle'),
        items: Array.from({ length: PART_COUNT }, (_, index) => ({
          title: t(`part${index + 1}_title`),
          description: t(`part${index + 1}_desc`),
        })),
      },
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
        items: Array.from({ length: FAQ_COUNT }, (_, index) => ({
          q: t(`faq_q${index + 1}`),
          a: t(`faq_a${index + 1}`),
        })),
      },
      finalCta: {
        title: t('final_title'),
        titleHighlight: t('final_highlight'),
        subtitle: t('final_subtitle'),
        primaryCta: { label: shared('final_primary'), href: '/signup?from=parts' },
        secondaryCta: { label: shared('final_secondary'), href: marketingPath('pricing', locale) },
      },
    }
  }
}
