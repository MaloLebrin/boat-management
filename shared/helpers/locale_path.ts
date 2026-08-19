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
 * Slug de la page tarifs par locale (#475) : l'anglais vit sur `/en/pricing`,
 * `/en/tarifs` ne subsiste que comme redirection permanente.
 */
export const PRICING_PATHS: Record<AppLocale, string> = {
  en: '/en/pricing',
  fr: '/fr/tarifs',
}

/** URL de la page tarifs pour une locale — source de vérité des liens et du SEO. */
export function pricingPath(locale: AppLocale): string {
  return PRICING_PATHS[locale]
}

/** Paths that differ between locales (suffix after /en or /fr). */
const LOCALIZED_PATH_ALIASES: Record<string, Record<AppLocale, string>> = {
  '/about': { en: '/about', fr: '/a-propos' },
  '/a-propos': { en: '/about', fr: '/a-propos' },
  '/pricing': { en: '/pricing', fr: '/tarifs' },
  '/tarifs': { en: '/pricing', fr: '/tarifs' },
}

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
