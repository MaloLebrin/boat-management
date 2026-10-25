/**
 * Contenu mixte (#1019) : une page `https:` ne peut pas appeler un serveur en
 * `http:` — le navigateur bloque la requête avant qu'elle parte, et l'erreur
 * ressemble à un serveur injoignable. Les adresses de bouclage restent
 * autorisées (contexte sécurisé).
 */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

export function isMixedContent(baseUrl: string, pageProtocol: string | undefined): boolean {
  if (pageProtocol !== 'https:') return false
  let url: URL
  try {
    url = new URL(baseUrl)
  } catch {
    return false
  }
  return url.protocol === 'http:' && !LOOPBACK_HOSTS.has(url.hostname)
}
