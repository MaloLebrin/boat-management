import { DATA_CACHE, PAGES_CACHE } from '~/lib/offline_cache'
import {
  readInertiaPageFromHtml,
  type CachedBoat,
  type OfflineBoatSnapshot,
  type OfflineSection,
} from '~/lib/offline_boat_context'
import type { BoatShowDetail } from '~/types/boat_show'

/**
 * Lecture des caches du service worker pour l'assistant hors-ligne (#982).
 *
 * Rien de neuf n'est stocké : la fiche bateau est relue telle que « Préparer
 * la traversée » (#967) l'a rangée — le document dans `inertia-pages`, les
 * props différées dans `inertia-data` sous la clé `inertiaDataCacheKey`.
 */

const BOAT_COMPONENT = 'boats/show'
const BOAT_PATH = /^\/boats\/(\d+)$/
/** Paramètre synthétique de `inertiaDataCacheKey` : `composant|props`. */
const DATA_KEY_PARAM = '__inertia'
const LAST_PREPARED_KEY = 'fleetai:passage:last-boat'

/** Retenu par `usePassagePreparation` : le bateau visé quand la page n'en désigne aucun. */
export function rememberPreparedBoat(boatId: number) {
  try {
    localStorage.setItem(LAST_PREPARED_KEY, String(boatId))
  } catch {
    // Stockage indisponible : l'assistant demandera de quel bateau il s'agit.
  }
}

export function readPreparedBoat(): number | null {
  try {
    const value = Number(localStorage.getItem(LAST_PREPARED_KEY))
    return Number.isInteger(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

function responseDate(response: Response): Date | null {
  const header = response.headers.get('Date')
  if (!header) return null
  const date = new Date(header)
  return Number.isNaN(date.getTime()) ? null : date
}

async function openCache(name: string): Promise<Cache | null> {
  if (typeof caches === 'undefined') return null
  try {
    return await caches.open(name)
  } catch {
    return null
  }
}

interface CachedEntry {
  boatId: number
  response: Response
  cachedAt: Date | null
}

function isNewer(candidate: Date | null, current: Date | null): boolean {
  return (candidate?.getTime() ?? 0) >= (current?.getTime() ?? 0)
}

/** Documents de fiche en cache, le plus récent par bateau (les onglets sont des URLs distinctes). */
async function latestBoatDocuments(): Promise<Map<number, CachedEntry>> {
  const latest = new Map<number, CachedEntry>()
  const cache = await openCache(PAGES_CACHE)
  if (!cache) return latest
  for (const request of await cache.keys()) {
    const match = BOAT_PATH.exec(new URL(request.url).pathname)
    if (!match) continue
    const response = await cache.match(request, { ignoreVary: true })
    if (!response) continue
    const entry = { boatId: Number(match[1]), response, cachedAt: responseDate(response) }
    const current = latest.get(entry.boatId)
    if (!current || isNewer(entry.cachedAt, current.cachedAt)) latest.set(entry.boatId, entry)
  }
  return latest
}

async function readBoatDocument(
  entry: CachedEntry
): Promise<{ boat: BoatShowDetail; cachedAt: Date | null } | null> {
  try {
    const page = readInertiaPageFromHtml(await entry.response.clone().text())
    if (page?.component !== BOAT_COMPONENT) return null
    const boat = page.props.boat as BoatShowDetail | undefined
    return boat ? { boat, cachedAt: entry.cachedAt } : null
  } catch {
    return null
  }
}

/** Bateaux dont la fiche est en cache — de quoi lever une ambiguïté. */
export async function listCachedBoats(): Promise<CachedBoat[]> {
  const boats: CachedBoat[] = []
  const documents = await latestBoatDocuments()
  for (const entry of documents.values()) {
    const document = await readBoatDocument(entry)
    if (document) boats.push({ id: document.boat.id, name: document.boat.name })
  }
  return boats.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Props différées en cache d'une fiche, chaque prop avec la date de sa
 * réponse. Un rechargement partiel (`only`) ajoute une entrée : la plus
 * récente l'emporte.
 */
async function readDeferredProps(boatId: number): Promise<Map<string, OfflineSection<unknown>>> {
  const props = new Map<string, OfflineSection<unknown>>()
  const cache = await openCache(DATA_CACHE)
  if (!cache) return props
  for (const request of await cache.keys()) {
    const url = new URL(request.url)
    const key = url.searchParams.get(DATA_KEY_PARAM) ?? ''
    if (url.pathname !== `/boats/${boatId}` || !key.startsWith(`${BOAT_COMPONENT}|`)) continue
    const response = await cache.match(request, { ignoreVary: true })
    if (!response) continue
    const cachedAt = responseDate(response)
    try {
      const page = (await response.clone().json()) as { props?: Record<string, unknown> }
      for (const [name, rows] of Object.entries(page.props ?? {})) {
        const current = props.get(name)
        if (!current || isNewer(cachedAt, current.cachedAt)) props.set(name, { rows, cachedAt })
      }
    } catch {
      // Entrée illisible : les autres groupes restent exploitables.
    }
  }
  return props
}

function section<T>(props: Map<string, OfflineSection<unknown>>, name: string) {
  const found = props.get(name)
  return found && Array.isArray(found.rows) ? (found as OfflineSection<T>) : null
}

export async function readOfflineBoatSnapshot(boatId: number): Promise<OfflineBoatSnapshot | null> {
  const documents = await latestBoatDocuments()
  const entry = documents.get(boatId)
  const document = entry ? await readBoatDocument(entry) : null
  if (!document) return null
  const props = await readDeferredProps(boatId)
  return {
    boatId,
    boatName: document.boat.name,
    cachedAt: document.cachedAt,
    engines: document.boat.engines ?? [],
    maintenanceTasks: section(props, 'maintenanceTasks'),
    fuelLogs: section(props, 'fuelLogs'),
    incidents: section(props, 'incidents'),
    navigationLogs: section(props, 'navigationLogs'),
  }
}
