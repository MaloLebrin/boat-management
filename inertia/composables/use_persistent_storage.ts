import { ref } from 'vue'

/**
 * Stockage persistant (#952, épic « Mode traversée » #949).
 *
 * Sans `persist()`, le navigateur peut évincer la file IndexedDB et les caches
 * du service worker : iOS après 7 jours sans visite hors PWA installée, Android
 * sous pression disque. Une traversée de 2 à 4 semaines y perdrait ses saisies.
 *
 * La demande part sur un geste utilisateur — installation de la PWA, premier
 * `enqueue` — parce que Chrome l'accorde selon l'engagement et que Firefox
 * affiche une invite. Une seule demande par chargement de page : un refus n'est
 * pas réitéré à chaque saisie.
 */

export interface StorageEstimateInfo {
  usage: number
  quota: number
}

// État module-level partagé — une seule demande par chargement de page.
const persisted = ref<boolean | null>(null)
const estimate = ref<StorageEstimateInfo | null>(null)
let pendingRequest: Promise<boolean> | null = null

function storageManager(): StorageManager | null {
  if (typeof navigator === 'undefined') return null
  return navigator.storage ?? null
}

/** Rafraîchit `estimate` ; `null` si l'API est absente ou échoue. */
export async function refreshStorageEstimate(): Promise<StorageEstimateInfo | null> {
  const storage = storageManager()
  if (typeof storage?.estimate !== 'function') return null
  try {
    const { usage = 0, quota = 0 } = await storage.estimate()
    estimate.value = { usage, quota }
  } catch {
    estimate.value = null
  }
  return estimate.value
}

async function askPersistence(storage: StorageManager): Promise<boolean> {
  try {
    if (typeof storage.persisted === 'function' && (await storage.persisted())) return true
    return await storage.persist()
  } catch {
    return false
  }
}

/**
 * Demande que l'origine soit exemptée d'éviction. Ne lève jamais : API absente,
 * refus ou erreur rendent `false`.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  const storage = storageManager()
  if (typeof storage?.persist !== 'function') {
    persisted.value = false
    return false
  }
  if (persisted.value === true) return true

  pendingRequest ??= askPersistence(storage).then(async (granted) => {
    persisted.value = granted
    await refreshStorageEstimate()
    return granted
  })
  return pendingRequest
}

export function usePersistentStorage() {
  return { persisted, estimate, requestPersistentStorage, refreshStorageEstimate }
}
