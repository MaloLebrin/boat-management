/**
 * Caches hors-ligne des pages terrain (#496, #967 — épic « Mode traversée » #949).
 *
 * Partagé entre le service worker et l'écran « Préparer la traversée » : les
 * deux doivent s'accorder sur les noms de caches et sur la clé des données
 * différées, sinon un pré-chargement réussi ne serait jamais relu.
 */

export const PAGES_CACHE = 'inertia-pages'
export const DATA_CACHE = 'inertia-data'

/** Une traversée dure 2 à 4 semaines : 35 jours couvrent l'aller et la marge. */
export const OFFLINE_CACHE_MAX_AGE_SECONDS = 35 * 24 * 3600

/**
 * Une traversée pré-charge 6 documents par bateau (fiche + 4 onglets +
 * planning) : 120 entrées gardent une flotte de 15 bateaux préparés plus les
 * pages visitées au fil de l'eau. Les données différées tiennent en une à deux
 * entrées par page (un groupe différé = une entrée), mais chaque rechargement
 * partiel (`only`) en ajoute une : on double.
 */
export const PAGES_MAX_ENTRIES = 120
export const DATA_MAX_ENTRIES = 240

/** Délai réseau avant de servir la copie en cache (pages et données). */
export const NETWORK_TIMEOUT_SECONDS = 3

/** Pages terrain mises en cache par le service worker. */
export const TERRAIN_PATH = /^\/(boats|navigation|planning)(\/|$)/

/** Message client → SW : pré-charger un document dans `inertia-pages`. */
export const WARM_PAGE_MESSAGE = 'passage:warm-page'

export interface WarmPageMessage {
  type: typeof WARM_PAGE_MESSAGE
  url: string
}

export interface WarmPageResult {
  url: string
  ok: boolean
}

export function isWarmPageMessage(data: unknown): data is WarmPageMessage {
  if (!data || typeof data !== 'object') return false
  const message = data as Record<string, unknown>
  return message.type === WARM_PAGE_MESSAGE && typeof message.url === 'string'
}

/** Paramètre ignoré par la clé des données : l'onglet de la fiche bateau est client-side. */
const IGNORED_DATA_PARAMS = ['tab']
const KEY_PARAM = '__inertia'

export interface InertiaPartialHeaders {
  component: string | null
  data: string | null
  except: string | null
}

function sortedList(value: string | null): string {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .sort()
    .join(',')
}

/**
 * Clé de cache d'un rechargement partiel Inertia (props différées).
 *
 * La réponse est du JSON servi sur l'URL de la page : la stocker sous l'URL
 * nue servirait du JSON à une navigation. La clé ajoute donc un paramètre
 * synthétique qui porte le composant et les props demandées — triées, pour que
 * le pré-chargement et le client Inertia tombent sur la même entrée.
 * `?tab=` est retiré : la fiche bateau change d'onglet sans requête, les props
 * différées ne dépendent pas de l'onglet ouvert au chargement.
 */
export function inertiaDataCacheKey(url: string, partial: InertiaPartialHeaders): string {
  const key = new URL(url)
  for (const param of IGNORED_DATA_PARAMS) key.searchParams.delete(param)
  key.hash = ''
  const parts = [partial.component ?? '', sortedList(partial.data)]
  const except = sortedList(partial.except)
  if (except) parts.push(`except:${except}`)
  key.searchParams.set(KEY_PARAM, parts.join('|'))
  return key.href
}

/**
 * Une réponse redirigée (session expirée → /login) ou non Inertia n'est pas
 * la page demandée : jamais rangée dans `inertia-data`.
 */
export function isCacheableInertiaData(response: Response): boolean {
  return (
    response.status === 200 && !response.redirected && response.headers.get('X-Inertia') === 'true'
  )
}
