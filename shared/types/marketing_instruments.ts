import type { FeatureCrossLink, FeatureCta, FeatureFaqItem } from '#shared/types/marketing'

/** Pictogramme d'une carte : clé résolue en icône Heroicons par le composant. */
export type InstrumentsMarketingIcon =
  | 'engine'
  | 'navigation'
  | 'power'
  | 'tanks'
  | 'environment'
  | 'alarm'
  | 'clock'
  | 'chart'
  | 'position'
  | 'server'
  | 'lock'
  | 'key'
  | 'eye'
  | 'shield'
  | 'archive'
  | 'users'
  | 'depth'
  | 'temperature'

/** Carte titre + description des sections de la page « instruments connectés » (#995). */
export interface InstrumentsMarketingCard {
  title: string
  description: string
  icon?: InstrumentsMarketingIcon
}

/** Règle d'alerte intégrée présentée sur la page (seuils lus dans `BUILTIN_ALERT_RULES`). */
export interface InstrumentsMarketingAlertCard extends InstrumentsMarketingCard {
  icon: InstrumentsMarketingIcon
  severity: 'warning' | 'critical'
  severityLabel: string
}

/** Section d'une grille de cartes : en-tête éditorial puis les cartes. */
export interface InstrumentsMarketingCardsSection {
  eyebrow: string
  title: string
  titleHighlight: string
  subtitle: string
  items: InstrumentsMarketingCard[]
}

/** Nombre de familles de mesures présentées, de bénéfices et de questions. */
export const INSTRUMENTS_MARKETING_CATEGORY_COUNT = 6
export const INSTRUMENTS_MARKETING_BENEFIT_COUNT = 4
export const INSTRUMENTS_MARKETING_SECURITY_COUNT = 4
export const INSTRUMENTS_MARKETING_FAQ_COUNT = 8

/**
 * Contenu éditorial de la page publique « Instruments de bord connectés »
 * (#995), assemblé par `MarketingInstrumentsContentService` : aucun texte en
 * dur dans le composant, tout vient de `marketing.features.instruments.*`.
 */
export interface InstrumentsMarketingContentProps {
  meta: { title: string; description: string }
  hero: {
    eyebrow: string
    title: string
    titleHighlight: string
    subtitle: string
    primaryCta: FeatureCta
    secondaryCta: FeatureCta
    reassurance: string
    /** Pastille « Bientôt disponible » : la fonctionnalité est annoncée, pas encore ouverte. */
    comingSoon: string
  }
  steps: {
    eyebrow: string
    title: string
    subtitle: string
    items: Array<{ step: string; title: string; description: string }>
  }
  categories: InstrumentsMarketingCardsSection
  benefits: InstrumentsMarketingCardsSection
  alerts: {
    eyebrow: string
    title: string
    titleHighlight: string
    subtitle: string
    items: InstrumentsMarketingAlertCard[]
    customTitle: string
    customDescription: string
    team: string
  }
  compatibility: {
    eyebrow: string
    title: string
    titleHighlight: string
    subtitle: string
    supportedTitle: string
    supported: string[]
    unsupportedTitle: string
    unsupported: string[]
    planNote: string
  }
  install: InstrumentsMarketingCardsSection & { helpCta: FeatureCta }
  security: InstrumentsMarketingCardsSection
  crossLinks: {
    eyebrow: string
    title: string
    linkLabel: string
    items: FeatureCrossLink[]
  }
  faq: {
    eyebrow: string
    title: string
    titleHighlight: string
    items: FeatureFaqItem[]
  }
  finalCta: {
    title: string
    titleHighlight: string
    subtitle: string
    primaryCta: FeatureCta
    secondaryCta: FeatureCta
  }
}
