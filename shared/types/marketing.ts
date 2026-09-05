/**
 * Ligne du comparatif détaillé de la page tarifs : le libellé, puis la valeur
 * pour Starter, Pro et Entreprise. `true`/`false` rendent une coche ou un tiret,
 * une chaîne rend le texte brut (`'addon'` rend le badge « Add-on »).
 */
export type PricingTableRow = [
  label: string,
  starter: boolean | string,
  pro: boolean | string,
  enterprise: boolean | string,
]

/**
 * Ligne « libellé : valeur » d'une section légale — l'identité de l'éditeur et
 * de l'hébergeur des mentions légales (#466), qui se lit comme une fiche et non
 * comme un paragraphe.
 */
export interface LegalEntry {
  label: string
  value: string
}

/**
 * Page légale (politique de confidentialité, CGU, CGV, mentions légales) : même
 * gabarit hero + sections numérotées + bloc contact, une seule source de
 * données (#455).
 */
export interface LegalSection {
  title: string
  body: string
  bullets?: string[]
  entries?: LegalEntry[]
}

/**
 * Identité de l'exploitant exigée par la LCEN (art. 6-III) : elle dépend de la
 * structure juridique réelle, elle vit donc dans l'environnement et non dans le
 * code (#466). Une valeur vide est rendue « à compléter » sur la page.
 */
export interface LegalEntity {
  companyName: string
  legalForm: string
  shareCapital: string
  registrationNumber: string
  vatNumber: string
  address: string
  email: string
  phone: string
  publicationDirector: string
  hostName: string
  hostAddress: string
  hostContact: string
  mediatorName: string
  mediatorUrl: string
}

export interface LegalDocument {
  hero: {
    eyebrow: string
    title: string
    titleHighlight: string
    subtitle: string
    updatedLabel: string
    updatedDate: string
  }
  sections: LegalSection[]
  contact: { title: string; body: string; email: string }
}

/**
 * Pages marketing dédiées aux fonctionnalités cœur (compréhension acheteur +
 * SEO). Une seule page Vue (`marketing/feature`) rend les trois, pilotée par
 * `featureKey` ; la copie vit sous `marketing.features.<featureKey>.*`.
 */
export type FeaturePageKey = 'maintenance' | 'fleet' | 'aiAssistant'

/** Mocks produit réutilisés des sections de la home (`HomeMock*`). */
export type FeatureMockType = 'boatDetail' | 'planning' | 'fleetide' | 'dashboard' | 'upcomingTasks'

export interface FeatureCta {
  label: string
  href: string
}

export interface FeatureBlock {
  eyebrow: string
  title: string
  titleHighlight: string
  body: string
  bullets: string[]
  mockType: FeatureMockType
}

/** Carte de maillage interne vers une autre page marketing (feature ou outil). */
export interface FeatureCrossLink {
  title: string
  description: string
  href: string
}

export interface FeatureFaqItem {
  q: string
  a: string
}

export interface FeaturePageProps {
  featureKey: FeaturePageKey
  t: {
    meta: { title: string; description: string }
    hero: {
      eyebrow: string
      title: string
      titleHighlight: string
      subtitle: string
      primaryCta: FeatureCta
      secondaryCta: FeatureCta
      reassurance: string
      mockType: FeatureMockType
    }
    blocks: FeatureBlock[]
    steps: {
      eyebrow: string
      title: string
      subtitle: string
      items: Array<{ step: string; title: string; description: string }>
    }
    proof: {
      stats: Array<{ value: string; label: string }>
      quote: { text: string; author: string; role: string }
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
}

/**
 * Page « Aide & support » : canaux de contact, FAQ agrégée par thèmes (les
 * réponses réutilisent les clés i18n de la home et du pricing — zéro copie
 * dupliquée) et ressources en self-service.
 */
export interface HelpChannelCard {
  title: string
  description: string
  ctaLabel: string
  href: string
  /** `true` = lien externe (mailto) rendu en ancre brute, pas en <Link> Inertia. */
  external?: boolean
  /** `true` = bouton qui lance la session de démo autonome (POST Inertia sur `href`). */
  demo?: boolean
}

export interface HelpFaqGroup {
  title: string
  items: FeatureFaqItem[]
}

export interface HelpPageProps {
  t: {
    meta: { title: string; description: string }
    hero: { eyebrow: string; title: string; titleHighlight: string; subtitle: string }
    channels: HelpChannelCard[]
    faq: { eyebrow: string; title: string; titleHighlight: string; groups: HelpFaqGroup[] }
    resources: {
      eyebrow: string
      title: string
      subtitle: string
      linkLabel: string
      items: FeatureCrossLink[]
    }
    finalCta: {
      title: string
      titleHighlight: string
      subtitle: string
      primaryCta: FeatureCta
      secondaryCta: FeatureCta
    }
  }
}

export interface AboutValueItem {
  n: string
  title: string
  desc: string
  extra: string
}

export interface AboutMember {
  n: string
  r: string
  b: string
  emoji: string
  color: string
}

export interface AboutStatItem {
  value: string
  label: string
}

export interface AboutTimelineItem {
  d: string
  t: string
  sub: string
  tone?: string
}

export interface AboutLocation {
  city: string
  addr: string
  role: string
}

export interface AboutOfficeCard {
  city: string
  role: string
  addr: string
  hours: string
  team: string
  hint: string
  gradient: string
}

export interface AboutPageProps {
  t: {
    meta: { title: string; description: string }
    about: {
      hero: {
        line1: string
        line1Highlight: string
        line2: string
        line2Highlight: string
        subtitle: string
      }
      origin: {
        eyebrow: string
        title: string
        paragraphs: string[]
        captionDate: string
        captionSub: string
      }
      values: { eyebrow: string; title: string; titleHighlight: string; items: AboutValueItem[] }
      team: {
        eyebrow: string
        title: string
        titleHighlight: string
        subtitle: string
        members: AboutMember[]
        hiringTitle: string
        hiringSubtitle: string
      }
      numbers: {
        eyebrow: string
        title: string
        titleHighlight: string
        stats: AboutStatItem[]
        investorsLabel: string
        investors: string[]
      }
      timeline: {
        eyebrow: string
        title: string
        titleHighlight: string
        subtitle: string
        items: AboutTimelineItem[]
      }
      office: {
        eyebrow: string
        title: string
        titleHighlight: string
        body: string
        locationLabel: string
        hoursLabel: string
        teamLabel: string
        locations: AboutLocation[]
        officeCards: AboutOfficeCard[]
      }
      finalCta: {
        title: string
        titleHighlight: string
        subtitle: string
        primaryCta: string
        secondaryCta: string
        /** Route POST de la démo autonome, cible du CTA secondaire. */
        demoLoginPath: string
      }
    }
  }
}
