import type { FeatureCrossLink, FeatureCta, FeatureFaqItem } from '#shared/types/marketing'
import type { InstrumentsMarketingCard } from '#shared/types/marketing_instruments'

/** Nombre de kits matériels, de critères du comparatif, d'étapes par chemin et de questions. */
export const INSTALL_SIGNALK_KIT_COUNT = 3
export const INSTALL_SIGNALK_COMPARISON_COUNT = 5
export const INSTALL_SIGNALK_PLUGIN_STEP_COUNT = 4
export const INSTALL_SIGNALK_APP_STEP_COUNT = 4
export const INSTALL_SIGNALK_HTTPS_STEP_COUNT = 4
export const INSTALL_SIGNALK_ENGINES_COUNT = 3
export const INSTALL_SIGNALK_TROUBLESHOOTING_COUNT = 6
export const INSTALL_SIGNALK_FAQ_COUNT = 8

/** Lien officiel (documentation ou boutique) d'un composant matériel : ancre externe. */
export interface InstallSignalKExternalLink {
  label: string
  href: string
}

/** Carte « kit » : une situation de départ, son matériel, un budget indicatif, des liens officiels. */
export interface InstallSignalKKit {
  title: string
  description: string
  budget: string
  duration: string
  items: string[]
  links: InstallSignalKExternalLink[]
}

/** Ligne du comparatif plugin / appli à bord. */
export interface InstallSignalKComparisonRow {
  criterion: string
  plugin: string
  app: string
}

/** Étape d'un HowTo : titre, texte, commande ou code optionnel, liens officiels optionnels. */
export interface InstallSignalKStep {
  title: string
  description: string
  code?: string
  codeLabel?: string
  codeCaption?: string
  links?: InstallSignalKExternalLink[]
}

/** Ligne du tableau de dépannage. */
export interface InstallSignalKTroubleshootingRow {
  symptom: string
  cause: string
}

/**
 * Contenu éditorial de la page publique « Installer Signal K à bord » (#1022),
 * assemblé par `MarketingInstallSignalKContentService` : aucun texte en dur dans
 * les composants, tout vient de `marketing.installSignalK.*` (tutoiement).
 */
export interface InstallSignalKMarketingContentProps {
  meta: { title: string; description: string }
  hero: {
    eyebrow: string
    title: string
    titleHighlight: string
    subtitle: string
    primaryCta: FeatureCta
    secondaryCta: FeatureCta
    reassurance: string
    /** Temps estimé par chemin, affiché sous le hero. */
    durations: Array<{ label: string; value: string }>
  }
  kits: {
    eyebrow: string
    title: string
    titleHighlight: string
    subtitle: string
    budgetLabel: string
    durationLabel: string
    linksLabel: string
    items: InstallSignalKKit[]
  }
  paths: {
    eyebrow: string
    title: string
    titleHighlight: string
    subtitle: string
    pluginTitle: string
    pluginBadge: string
    pluginDescription: string
    appTitle: string
    appDescription: string
    criterionHeader: string
    rows: InstallSignalKComparisonRow[]
  }
  pluginHowTo: {
    eyebrow: string
    title: string
    titleHighlight: string
    subtitle: string
    totalTime: string
    steps: InstallSignalKStep[]
    /** Paquet npm du plugin, cité tel quel dans l'alternative Appstore. */
    packageName: string
  }
  appHowTo: {
    eyebrow: string
    title: string
    titleHighlight: string
    subtitle: string
    totalTime: string
    steps: InstallSignalKStep[]
  }
  https: {
    eyebrow: string
    title: string
    titleHighlight: string
    subtitle: string
    steps: InstallSignalKStep[]
    fallbackTitle: string
    fallbackDescription: string
    iphoneTitle: string
    iphoneNote: string
  }
  engines: InstrumentsMarketingCardsSectionLike
  troubleshooting: {
    eyebrow: string
    title: string
    titleHighlight: string
    subtitle: string
    symptomHeader: string
    causeHeader: string
    rows: InstallSignalKTroubleshootingRow[]
  }
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

/** Même forme que `InstrumentsMarketingCardsSection` : rendu par `InstrumentsCardsSection`. */
export interface InstrumentsMarketingCardsSectionLike {
  eyebrow: string
  title: string
  titleHighlight: string
  subtitle: string
  items: InstrumentsMarketingCard[]
}
