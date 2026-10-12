import type { router as inertiaRouter } from '@inertiajs/vue3'
import { probeConnectivity } from '~/composables/use_connectivity'

/**
 * Navigation hors-ligne vers une page en cache (#968, épic « Mode traversée » #949).
 *
 * Une visite Inertia est un XHR `X-Inertia` : le service worker ne la sert pas
 * depuis le cache (il ne met en cache que les navigations pleine page, pour ne
 * jamais servir du JSON à un document). Hors-ligne, un clic sur un `<Link>`
 * échouait donc sans rien afficher alors que la page était en cache.
 *
 * Quand une visite de navigation n'obtient **aucune réponse** (erreur réseau,
 * pas une 4xx/5xx), on bascule en navigation pleine page : le SW sert la
 * dernière version en cache, ou `/offline.html`. La bascule est un chargement
 * de document, pas une visite Inertia — elle ne peut pas reboucler.
 *
 * Restent exclus : les mutations (la file hors-ligne s'en charge), les
 * préchargements et les rechargements partiels (`only`/`except`), qui ne
 * correspondent pas à un clic de l'utilisateur.
 */

interface NetworkErrorLike {
  response?: unknown
  config?: {
    method?: string
    url?: string
    params?: Record<string, unknown>
    headers?: Record<string, unknown> & { get?: (name: string) => unknown }
  }
}

function readHeader(headers: NonNullable<NetworkErrorLike['config']>['headers'], name: string) {
  if (!headers) return undefined
  if (typeof headers.get === 'function') return headers.get(name) ?? undefined
  return headers[name]
}

/**
 * URL vers laquelle basculer en navigation pleine page, ou `null` si
 * l'exception ne vient pas d'une visite de navigation restée sans réponse.
 */
export function offlineFallbackUrl(exception: unknown, origin: string): string | null {
  if (!exception || typeof exception !== 'object') return null
  const { response, config } = exception as NetworkErrorLike
  if (response !== undefined || !config?.url) return null
  if ((config.method ?? 'get').toLowerCase() !== 'get') return null
  if (readHeader(config.headers, 'X-Inertia') === undefined) return null
  if (readHeader(config.headers, 'Purpose') === 'prefetch') return null
  if (readHeader(config.headers, 'X-Inertia-Partial-Component') !== undefined) return null

  const url = new URL(config.url, origin)
  if (url.origin !== origin) return null
  for (const [key, value] of Object.entries(config.params ?? {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
  }
  return url.href
}

let installed = false
let navigating = false

export function installOfflineNavigationFallback(router: typeof inertiaRouter) {
  if (installed || typeof window === 'undefined') return
  installed = true
  router.on('exception', (event) => {
    const target = offlineFallbackUrl(event.detail.exception, window.location.origin)
    if (target === null) return
    // Empêche le rejet de la visite : la bascule prend le relais.
    event.preventDefault()
    if (navigating) return
    navigating = true
    void probeConnectivity()
    window.location.assign(target)
  })
}

/** Réinitialisation pour les tests. */
export function resetOfflineNavigationFallback() {
  installed = false
  navigating = false
}
