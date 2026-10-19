/**
 * Normalise l'adresse d'un serveur Signal K en **origine** (`https?://hôte[:port]`),
 * ou `null` si elle n'en est pas une (#988, D2).
 *
 * La valeur enregistrée est réinjectée telle quelle dans l'en-tête CSP de la
 * fiche bateau (`connect-src`) : elle ne doit donc jamais porter de chemin,
 * de paramètres, de fragment ni d'identifiants. Le port par défaut du schéma
 * est effacé par `URL#origin` (`https://h:443` → `https://h`), ce qui donne
 * une forme canonique pour la comparaison et pour la CSP.
 */
export function normalizeInstrumentBaseUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0 || trimmed.length > 255) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (url.username !== '' || url.password !== '') return null
  if (url.search !== '' || url.hash !== '') return null
  if (url.pathname !== '/' && url.pathname !== '') return null
  // Un `/` final est toléré à la saisie, mais rien d'autre après l'autorité.
  const authorityEnd = trimmed.indexOf('/', url.protocol.length + 2)
  if (authorityEnd !== -1 && authorityEnd !== trimmed.length - 1) return null
  if (url.hostname.length === 0) return null

  return url.origin
}
