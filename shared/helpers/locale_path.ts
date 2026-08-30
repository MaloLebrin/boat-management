export const APP_LOCALES = ['en', 'fr'] as const

export type AppLocale = (typeof APP_LOCALES)[number]

export const DEFAULT_APP_LOCALE: AppLocale = 'fr'

/**
 * Narrows an arbitrary locale string (`i18n.locale`, a cookie, a profile field)
 * to a locale the app actually supports. Anything unknown falls back to the
 * default locale rather than leaking a bogus tag downstream.
 */
export function toAppLocale(locale: string | null | undefined): AppLocale {
  return APP_LOCALES.includes(locale as AppLocale) ? (locale as AppLocale) : DEFAULT_APP_LOCALE
}

const LOCALE_PREFIX = /^\/(en|fr)(?=\/|$)/

/**
 * Slug de chaque page marketing, par locale (#475). Source de vérité unique des
 * liens internes, des `canonical`/`hreflang`, du sitemap et du sélecteur de
 * langue : doit rester aligné sur `start/routes/marketing.ts`. Un lien vers une
 * de ces pages ne s'écrit jamais en interpolant la locale (`/${locale}/tarifs`),
 * sinon la locale dont le slug diffère tombe sur un 404.
 */
export const MARKETING_SLUGS = {
  home: { en: '', fr: '' },
  pricing: { en: '/pricing', fr: '/tarifs' },
  simulator: { en: '/maintenance-cost-simulator', fr: '/simulateur-cout-entretien' },
  guide: { en: '/boat-maintenance-cost', fr: '/cout-entretien-bateau' },
  diagnosisAi: { en: '/engine-diagnosis-ai', fr: '/diagnostic-panne-ia' },
  about: { en: '/about', fr: '/a-propos' },
  contact: { en: '/contact', fr: '/contact' },
  privacy: { en: '/privacy', fr: '/confidentialite' },
  terms: { en: '/terms', fr: '/cgu' },
  salesTerms: { en: '/sales-terms', fr: '/cgv' },
  legalNotice: { en: '/legal-notice', fr: '/mentions-legales' },
} satisfies Record<string, Record<AppLocale, string>>

export type MarketingPage = keyof typeof MARKETING_SLUGS

/** URL d'une page marketing dans une locale : `marketingPath('pricing', 'en')` → `/en/pricing`. */
export function marketingPath(page: MarketingPage, locale: AppLocale): string {
  return `/${locale}${MARKETING_SLUGS[page][locale]}`
}

/**
 * Index bidirectionnel slug → paire de slugs : `/tarifs` comme `/pricing`
 * désignent la page tarifs, quelle que soit la locale du chemin d'origine.
 * L'ancien slug EN `/en/tarifs` (redirigé en 301, #475) reste ainsi traduisible.
 * La home est exclue : son suffixe est vide, `stripLocalePathPrefix` renvoie `/`.
 */
const LOCALIZED_PATH_ALIASES: Record<string, Record<AppLocale, string>> = Object.fromEntries(
  Object.values(MARKETING_SLUGS)
    .filter((slugs) => APP_LOCALES.every((locale) => slugs[locale] !== ''))
    .flatMap((slugs) => APP_LOCALES.map((locale) => [slugs[locale], slugs]))
)

export function hasLocalePathPrefix(path: string): boolean {
  return LOCALE_PREFIX.test(path)
}

export function stripLocalePathPrefix(path: string): string {
  if (!hasLocalePathPrefix(path)) {
    return path
  }
  const rest = path.replace(LOCALE_PREFIX, '')
  return rest || '/'
}

function localizedSuffix(pathWithoutLocale: string, targetLocale: AppLocale): string {
  const alias = LOCALIZED_PATH_ALIASES[pathWithoutLocale]
  if (alias) {
    return alias[targetLocale]
  }
  return pathWithoutLocale
}

/**
 * Builds the URL for the same page in another locale when the path uses /en or /fr.
 * Returns null for routes without a locale prefix (e.g. /login) — use POST /locale instead.
 */
export function buildLocaleSwitchHref(path: string, targetLocale: AppLocale): string | null {
  if (!hasLocalePathPrefix(path)) {
    return null
  }

  const withoutLocale = stripLocalePathPrefix(path)
  const suffix = localizedSuffix(withoutLocale, targetLocale)
  return suffix === '/' ? `/${targetLocale}` : `/${targetLocale}${suffix}`
}
