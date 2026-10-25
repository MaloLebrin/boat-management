import type { FeatureCrossLink, FeatureCta, FeatureFaqItem } from '#shared/types/marketing'

/** Carte titre + description des sections de la page « instruments connectés » (#995). */
export interface InstrumentsMarketingCard {
  title: string
  description: string
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
export const INSTRUMENTS_MARKETING_BENEFIT_COUNT = 3
export const INSTRUMENTS_MARKETING_SECURITY_COUNT = 4
export const INSTRUMENTS_MARKETING_FAQ_COUNT = 7

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
  }
  steps: {
    eyebrow: string
    title: string
    subtitle: string
    items: Array<{ step: string; title: string; description: string }>
  }
  categories: InstrumentsMarketingCardsSection
  benefits: InstrumentsMarketingCardsSection
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
