import app from '@adonisjs/core/services/app'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Extension de `connect-src` par réponse, pour le serveur Signal K d'un
 * bateau (#988, D2).
 *
 * `config/shield.ts` pose `connect-src 'self'` sur toutes les pages, et
 * l'origine du serveur de bord est **par bateau** : impossible de la déclarer
 * statiquement. Shield (via `helmet-csp`) écrit l'en-tête de façon synchrone
 * dans le middleware serveur, donc **avant** le handler de route :
 * `BoatsController.show()` peut le relire, y ajouter l'origine de la source,
 * et le reposer. En test, Shield est retiré du kernel : sans en-tête, le
 * helper ne fait rien.
 */

/** Les deux noms possibles de l'en-tête selon `reportOnly`. */
export const CSP_HEADER_NAMES = [
  'content-security-policy',
  'content-security-policy-report-only',
] as const

const CONNECT_SRC = 'connect-src'
const DEFAULT_SRC = 'default-src'

/**
 * Ajoute `origins` à la directive `connect-src` de `header` (en la créant à
 * partir de `default-src` si elle manque — c'est ce que le navigateur ferait
 * sans elle). Pure, idempotente : une origine déjà présente n'est pas doublée.
 */
export function appendConnectSrc(header: string, origins: readonly string[]): string {
  if (origins.length === 0) return header

  const directives = header
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

  const index = directives.findIndex((directive) => directiveName(directive) === CONNECT_SRC)
  const base =
    index === -1
      ? (directives.find((directive) => directiveName(directive) === DEFAULT_SRC) ?? '')
          .split(/\s+/)
          .slice(1)
      : directives[index].split(/\s+/).slice(1)

  const sources = [...base]
  for (const origin of origins) {
    if (!sources.includes(origin)) sources.push(origin)
  }

  const rebuilt = `${CONNECT_SRC} ${sources.join(' ')}`
  if (index === -1) directives.push(rebuilt)
  else directives[index] = rebuilt

  return directives.join('; ')
}

function directiveName(directive: string): string {
  return directive.split(/\s+/, 1)[0].toLowerCase()
}

/**
 * Origines CSP à ouvrir pour une `baseUrl` déjà normalisée en origine
 * (`normalizeInstrumentBaseUrl`) : `https://hôte[:port]` et
 * `wss://hôte[:port]` toujours — le navigateur refuse de toute façon le
 * contenu mixte depuis une page HTTPS —, plus `http://` et `ws://` quand
 * `allowInsecure` (hors production : l'app est en HTTP et la CSP en
 * report-only, un `ws://localhost:3000` doit passer sans bruit en console).
 */
export function instrumentConnectOrigins(
  baseUrl: string,
  options: { allowInsecure: boolean }
): string[] {
  let url: URL
  try {
    url = new URL(baseUrl)
  } catch {
    return []
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return []

  const host = url.host
  const origins = [`https://${host}`, `wss://${host}`]
  if (options.allowInsecure) origins.push(`http://${host}`, `ws://${host}`)
  return origins
}

/**
 * Relit l'en-tête CSP posé par Shield (appliqué ou report-only), y ajoute
 * les origines de la source, et le réécrit sur la réponse Node — là où
 * Shield l'a mis. Sans source ou sans en-tête : no-op.
 */
export function applyInstrumentCsp(
  ctx: Pick<HttpContext, 'response'>,
  source: { baseUrl: string } | null,
  options: { allowInsecure?: boolean } = {}
): void {
  if (!source) return
  const origins = instrumentConnectOrigins(source.baseUrl, {
    allowInsecure: options.allowInsecure ?? !app.inProduction,
  })
  if (origins.length === 0) return

  const nodeResponse = ctx.response.response
  for (const name of CSP_HEADER_NAMES) {
    const current = nodeResponse.getHeader(name)
    if (typeof current !== 'string' || current.length === 0) continue
    nodeResponse.setHeader(name, appendConnectSrc(current, origins))
  }
}
