import { openDB } from 'idb'
import type { TelemetrySampleInput } from '#shared/types/instruments'
import type { AggregatorSnapshot } from './aggregator'

/**
 * Fenêtre d'agrégation en cours, persistée dans IndexedDB (#989) : un
 * rechargement de page — fréquent sur un téléphone en veille — ne doit pas
 * jeter la dernière demi-heure de mesures. Base distincte de la file
 * hors-ligne : ce n'est pas une mutation à rejouer, seulement un brouillon.
 */

const DB_NAME = 'fleetide-instruments'
const STORE = 'windows'
const DB_VERSION = 1

export interface PersistedWindow {
  sourceId: number
  snapshot: AggregatorSnapshot
  /** Lots qui n'ont pu être ni envoyés ni enfilés (plafond de la file atteint). */
  held: TelemetrySampleInput[][]
  savedAt: string
}

function available(): boolean {
  try {
    return typeof indexedDB !== 'undefined'
  } catch {
    return false
  }
}

function db() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE, { keyPath: 'sourceId' })
      }
    },
  })
}

export async function loadWindow(sourceId: number): Promise<PersistedWindow | null> {
  if (!available()) return null
  try {
    const database = await db()
    const entry = (await database.get(STORE, sourceId)) as PersistedWindow | undefined
    return entry ?? null
  } catch {
    return null
  }
}

export async function saveWindow(entry: PersistedWindow): Promise<void> {
  if (!available()) return
  try {
    const database = await db()
    await database.put(STORE, entry)
  } catch {
    // Brouillon : une écriture perdue coûte au pire une fenêtre.
  }
}

export async function clearWindow(sourceId: number): Promise<void> {
  if (!available()) return
  try {
    const database = await db()
    await database.delete(STORE, sourceId)
  } catch {
    // idem
  }
}
