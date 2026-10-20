import { usePage } from '@inertiajs/vue3'
import { ref } from 'vue'
import {
  requestPersistentStorage,
  refreshStorageEstimate,
} from '~/composables/use_persistent_storage'
import {
  PAGES_CACHE,
  WARM_PAGE_MESSAGE,
  type WarmPageMessage,
  type WarmPageResult,
} from '~/lib/offline_cache'
import { rememberPreparedBoat } from '~/lib/offline_boat_cache'
import {
  passagePages,
  passagePageUrls,
  type PassageEngine,
  type PassagePage,
} from '~/lib/passage_preparation'

/**
 * « Préparer la traversée » (#967, épic « Mode traversée » #949).
 *
 * Pré-charge les pages terrain d'un bateau avant une coupure longue :
 * - le **document** de chaque page est demandé au service worker, qui le range
 *   dans `inertia-pages` comme une navigation ;
 * - ses **props différées** sont réclamées comme le ferait le client Inertia
 *   (visite `X-Inertia`, puis un rechargement partiel par groupe différé) :
 *   le SW les range dans `inertia-data`. Sans elles, une fiche servie depuis
 *   le cache s'ouvrirait vide.
 *
 * Pages traitées une par une : la progression est lisible et la bande
 * passante d'un ponton n'est pas saturée par six requêtes simultanées.
 */

export type PassagePageStatus = 'idle' | 'loading' | 'done' | 'failed'

export interface PassagePageState extends PassagePage {
  status: PassagePageStatus
  cachedAt: Date | null
}

/** Au-delà, un SW qui ne répond pas (ancienne version sans gestionnaire) compte comme un échec. */
export const WARM_TIMEOUT_MS = 30_000

function serviceWorkerController(): ServiceWorker | null {
  if (typeof navigator === 'undefined') return null
  return navigator.serviceWorker?.controller ?? null
}

function warmPageInServiceWorker(controller: ServiceWorker, url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const channel = new MessageChannel()
    const timer = setTimeout(() => {
      channel.port1.close()
      resolve(false)
    }, WARM_TIMEOUT_MS)
    channel.port1.onmessage = (event: MessageEvent<WarmPageResult>) => {
      clearTimeout(timer)
      channel.port1.close()
      resolve(event.data?.ok === true)
    }
    const message: WarmPageMessage = { type: WARM_PAGE_MESSAGE, url }
    controller.postMessage(message, [channel.port2])
  })
}

interface InertiaPageResponse {
  component: string
  deferredProps?: Record<string, string[]>
}

async function fetchInertia(url: string, headers: Record<string, string>): Promise<Response> {
  return fetch(url, {
    credentials: 'same-origin',
    headers: {
      'X-Inertia': 'true',
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'text/html, application/xhtml+xml',
      ...headers,
    },
  })
}

/** Une redirection (session expirée → /login) ou un 409 de version n'est pas la page. */
function isInertiaPage(response: Response): boolean {
  return response.ok && !response.redirected && response.headers.get('X-Inertia') === 'true'
}

/**
 * Réclame les props différées d'une page, groupe par groupe, avec les en-têtes
 * exacts du client Inertia : c'est leur clé dans `inertia-data`.
 */
export async function warmDeferredProps(url: string, version: string | null): Promise<boolean> {
  try {
    const versionHeader: Record<string, string> = version ? { 'X-Inertia-Version': version } : {}
    const response = await fetchInertia(url, versionHeader)
    if (!isInertiaPage(response)) return false
    const page = (await response.json()) as InertiaPageResponse
    for (const group of Object.values(page.deferredProps ?? {})) {
      const partial = await fetchInertia(url, {
        ...versionHeader,
        'X-Inertia-Partial-Component': page.component,
        'X-Inertia-Partial-Data': group.join(','),
      })
      if (!isInertiaPage(partial)) return false
    }
    return true
  } catch {
    return false
  }
}

/** Date de la copie en cache d'une page, `null` si absente ou illisible. */
export async function readCachedAt(url: string): Promise<Date | null> {
  if (typeof caches === 'undefined') return null
  try {
    const cache = await caches.open(PAGES_CACHE)
    const response = await cache.match(new URL(url, window.location.origin).href, {
      ignoreVary: true,
    })
    const header = response?.headers.get('Date')
    if (!header) return response ? new Date(0) : null
    const date = new Date(header)
    return Number.isNaN(date.getTime()) ? new Date(0) : date
  } catch {
    return null
  }
}

/** Clé commune des props différées : l'onglet n'y entre pas (cf. `inertiaDataCacheKey`). */
function withoutTab(url: string): string {
  const parsed = new URL(url, 'http://local')
  parsed.searchParams.delete('tab')
  return parsed.pathname + parsed.search
}

/**
 * Date de la plus ancienne copie d'une ligne ; `null` dès qu'une de ses pages
 * manque — une checklist en cache sans ses fiches ne tient pas en mer.
 */
async function readRowCachedAt(item: PassagePage): Promise<Date | null> {
  let oldest: Date | null = null
  for (const url of passagePageUrls(item)) {
    const cachedAt = await readCachedAt(url)
    if (!cachedAt) return null
    if (!oldest || cachedAt < oldest) oldest = cachedAt
  }
  return oldest
}

export function usePassagePreparation(
  boatId: () => number,
  engines: () => readonly PassageEngine[] = () => [],
  options: () => { instruments?: boolean } = () => ({})
) {
  const page = usePage()
  const pages = ref<PassagePageState[]>(
    passagePages(boatId(), engines(), options()).map((item) => ({
      ...item,
      status: 'idle',
      cachedAt: null,
    }))
  )
  const isPreparing = ref(false)
  const serviceWorkerReady = ref(serviceWorkerController() !== null)

  async function refreshCachedDates() {
    serviceWorkerReady.value = serviceWorkerController() !== null
    for (const item of pages.value) item.cachedAt = await readRowCachedAt(item)
  }

  async function prepare() {
    if (isPreparing.value) return
    isPreparing.value = true
    // Bateau que l'assistant hors-ligne visera hors d'une fiche (#982).
    rememberPreparedBoat(boatId())
    for (const item of pages.value) item.status = 'idle'
    // Le clic est un geste utilisateur : on en profite pour demander la
    // persistance (#952), sans quoi le cache peut être évincé en mer.
    await requestPersistentStorage()

    const controller = serviceWorkerController()
    serviceWorkerReady.value = controller !== null
    const warmedData = new Map<string, boolean>()
    try {
      for (const item of pages.value) {
        if (!controller) {
          item.status = 'failed'
          continue
        }
        item.status = 'loading'
        let ok = true
        for (const url of passagePageUrls(item)) {
          const documentOk = await warmPageInServiceWorker(controller, url)
          const dataKey = withoutTab(url)
          if (!warmedData.has(dataKey)) {
            warmedData.set(dataKey, await warmDeferredProps(dataKey, page.version ?? null))
          }
          ok = ok && documentOk && warmedData.get(dataKey) === true
        }
        item.status = ok ? 'done' : 'failed'
      }
    } finally {
      await refreshCachedDates()
      await refreshStorageEstimate()
      isPreparing.value = false
    }
  }

  return { pages, isPreparing, serviceWorkerReady, prepare, refreshCachedDates }
}
