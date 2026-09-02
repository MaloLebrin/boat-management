import { router, usePage } from '@inertiajs/vue3'
import { openDB } from 'idb'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { useT } from '~/composables/use_t'

const DB_NAME = 'fleetide-offline-queue'
const STORE_NAME = 'actions'
const FAILED_STORE_NAME = 'failed'
// v2 (#487) : ajout du store `failed` — les actions refusées en 4xx y sont
// déplacées au lieu d'être détruites. La montée de version préserve le store
// `actions` existant (upgrade ne crée que les stores manquants).
// Les dépendances entre actions (#622) n'ont pas demandé de v3 : `tempId` et
// `dependsOn` sont des champs optionnels sur les enregistrements existants.
const DB_VERSION = 2

/** Préfixe des identifiants temporaires — jamais numérique, donc jamais confondu
 * avec un ID réel rendu par le backend. */
const TEMP_ID_PREFIX = 'tmp_'

export interface QueuedAction {
  id?: number
  type: string
  url: string
  method: 'post' | 'patch' | 'put'
  payload: Record<string, unknown>
  createdAt: string
  /**
   * Clé de déduplication (#490) : deux enqueue successifs portant la même clé
   * font un upsert — la dernière valeur remplace la précédente au lieu
   * d'empiler des actions contradictoires (ex. deux toggles du même item de
   * fiche d'entretien). Convention : `type:url`.
   */
  dedupeKey?: string
  /**
   * Cette action **crée** une ressource que d'autres actions référencent avant
   * qu'elle n'existe côté serveur (#622). Le jeton l'identifie côté client ; au
   * rejeu, l'ID réel flashé par le contrôleur le remplace dans les actions
   * filles.
   */
  tempId?: string
  /**
   * Cette action **référence** un `tempId` : son URL (et parfois son payload)
   * contient le jeton, elle n'est rejouable qu'une fois la création parente
   * synchronisée (#622).
   */
  dependsOn?: string
}

export interface FailedAction extends QueuedAction {
  failedAt: string
  errors: Record<string, string>
}

export interface ConflictState {
  action: QueuedAction
  serverData: Record<string, unknown>
}

/** Jeton d'inspection (ou autre création) saisie hors-ligne, référencé par ses actions filles. */
export function newTempId(): string {
  return `${TEMP_ID_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export function isTempId(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(TEMP_ID_PREFIX)
}

/** Une création et les actions qui la référencent, telles que la file les rejouera. */
export interface QueueGroup<T extends QueuedAction> {
  action: T
  dependents: T[]
}

/**
 * Regroupe les actions filles sous leur création parente pour l'affichage
 * (#622) : reprendre ou abandonner un groupe est une seule décision côté
 * utilisateur. Une fille dont la parente n'est plus là est rendue seule.
 */
export function groupByDependency<T extends QueuedAction>(actions: T[]): QueueGroup<T>[] {
  const groups: QueueGroup<T>[] = []
  const byTempId = new Map<string, QueueGroup<T>>()

  for (const action of actions) {
    if (action.dependsOn) continue
    const group: QueueGroup<T> = { action, dependents: [] }
    groups.push(group)
    if (action.tempId) byTempId.set(action.tempId, group)
  }

  for (const action of actions) {
    if (!action.dependsOn) continue
    const parent = byTempId.get(action.dependsOn)
    if (parent) parent.dependents.push(action)
    else groups.push({ action, dependents: [] })
  }

  return groups
}

function isIndexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined'
  } catch {
    return false
  }
}

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains(FAILED_STORE_NAME)) {
        db.createObjectStore(FAILED_STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    },
  })
}

type QueueDb = Awaited<ReturnType<typeof getDb>>

// Module-level shared state — all composable instances share the same refs
const pendingCount = ref(0)
const pendingActions = ref<QueuedAction[]>([])
const failedCount = ref(0)
const failedActions = ref<FailedAction[]>([])
const isSyncing = ref(false)
export const conflictedAction = ref<ConflictState | null>(null)
let countInitialized = false

async function refreshCount() {
  if (!isIndexedDbAvailable()) return
  const db = await getDb()
  const actions = (await db.getAll(STORE_NAME)) as QueuedAction[]
  pendingCount.value = actions.length
  pendingActions.value = actions
  const failed = (await db.getAll(FAILED_STORE_NAME)) as FailedAction[]
  failedCount.value = failed.length
  failedActions.value = failed
}

/** Remplace le jeton par l'ID réel dans les valeurs de premier niveau du payload. */
function substitutePayload(
  payload: Record<string, unknown>,
  tempId: string,
  realId: string
): Record<string, unknown> {
  const numeric = Number(realId)
  const replacement: string | number = Number.isFinite(numeric) ? numeric : realId
  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    next[key] = value === tempId ? replacement : value
  }
  return next
}

/**
 * Résolution de dépendances (#622) : la création parente vient de rendre son ID
 * réel — chaque action fille voit son URL et son payload réécrits, et perd son
 * `dependsOn` puisqu'elle est désormais rejouable telle quelle.
 */
async function resolveTempId(db: QueueDb, tempId: string, realId: string) {
  const actions = (await db.getAll(STORE_NAME)) as QueuedAction[]
  for (const dependent of actions) {
    if (dependent.dependsOn !== tempId) continue
    await db.put(STORE_NAME, {
      id: dependent.id,
      type: dependent.type,
      url: dependent.url.replaceAll(tempId, realId),
      method: dependent.method,
      payload: substitutePayload(dependent.payload, tempId, realId),
      createdAt: dependent.createdAt,
      ...(dependent.dedupeKey ? { dedupeKey: dependent.dedupeKey } : {}),
      ...(dependent.tempId ? { tempId: dependent.tempId } : {}),
    })
  }
}

function toFailedRecord(action: QueuedAction, errors: Record<string, string>) {
  return {
    type: action.type,
    url: action.url,
    method: action.method,
    payload: action.payload,
    createdAt: action.createdAt,
    ...(action.dedupeKey ? { dedupeKey: action.dedupeKey } : {}),
    ...(action.tempId ? { tempId: action.tempId } : {}),
    ...(action.dependsOn ? { dependsOn: action.dependsOn } : {}),
    failedAt: new Date().toISOString(),
    errors,
  }
}

async function moveToFailed(db: QueueDb, action: QueuedAction, errors: Record<string, string>) {
  await db.add(FAILED_STORE_NAME, toFailedRecord(action, errors))
  await db.delete(STORE_NAME, action.id!)
}

/**
 * La création parente a échoué (ou n'a pas rendu son ID) : ses actions filles
 * rejoueraient sur une URL contenant encore le jeton temporaire, que le
 * contrôleur rendrait en redirection — donc une perte silencieuse. Elles
 * partent en échec avec le même motif, `dependsOn` conservé pour la reprise
 * groupée (#622).
 */
async function cascadeDependentsToFailed(db: QueueDb, tempId: string, reason: string) {
  const actions = (await db.getAll(STORE_NAME)) as QueuedAction[]
  for (const dependent of actions) {
    if (dependent.dependsOn !== tempId) continue
    await moveToFailed(db, dependent, { dependency: reason })
  }
}

/** Remet une action en file en conservant ses métadonnées (dédup, dépendances). */
async function requeue(db: QueueDb, action: QueuedAction) {
  await db.add(STORE_NAME, {
    type: action.type,
    url: action.url,
    method: action.method,
    payload: action.payload,
    createdAt: action.createdAt,
    ...(action.dedupeKey ? { dedupeKey: action.dedupeKey } : {}),
    ...(action.tempId ? { tempId: action.tempId } : {}),
    ...(action.dependsOn ? { dependsOn: action.dependsOn } : {}),
  })
}

async function dependentsOf(
  db: QueueDb,
  storeName: typeof STORE_NAME | typeof FAILED_STORE_NAME,
  tempId: string
) {
  const all = (await db.getAll(storeName)) as QueuedAction[]
  return all.filter((candidate) => candidate.dependsOn === tempId)
}

export function useOfflineQueue() {
  const { t } = useT()
  const page = usePage()

  async function enqueue(action: Omit<QueuedAction, 'id' | 'createdAt'>) {
    if (!isIndexedDbAvailable()) return
    const db = await getDb()

    if (action.dedupeKey) {
      const existing = (await db.getAll(STORE_NAME)) as QueuedAction[]
      const duplicate = existing.find((a) => a.dedupeKey === action.dedupeKey)
      if (duplicate) {
        // Upsert : le payload le plus récent remplace l'ancien, la position
        // FIFO (id, createdAt) est conservée — pas de toast pour ne pas
        // notifier chaque frappe d'une saisie de notes (#490).
        // Le `tempId` existant est préservé : ré-éditer une inspection encore
        // en file ne doit pas orpheliner les défauts déjà rattachés (#622).
        await db.put(STORE_NAME, { ...duplicate, payload: action.payload })
        await refreshCount()
        return
      }
    }

    await db.add(STORE_NAME, { ...action, createdAt: new Date().toISOString() })
    await refreshCount()
    toast.info(t('common.offline.savedQueue'))
  }

  async function drainQueue() {
    if (isSyncing.value || !isIndexedDbAvailable()) return
    isSyncing.value = true
    const db = await getDb()
    const actions = (await db.getAll(STORE_NAME)) as QueuedAction[]
    if (!actions.length) {
      isSyncing.value = false
      return
    }

    const totalCount = actions.length
    const action = actions[0]
    toast.info(t('common.offline.syncing'))

    // Track whether onSuccess or onError ran so onFinish can detect 5xx/network errors.
    let settled = false

    /** Fin de passe commune aux chemins de refus : la file continue. */
    async function afterRejection() {
      await refreshCount()
      isSyncing.value = false
      toast.error(t('common.offline.syncRejected'))
      if (pendingCount.value > 0) {
        await drainQueue()
      }
    }

    const callbacks = {
      preserveScroll: true as const,
      onSuccess: async () => {
        settled = true
        const flash = (page.props as Record<string, unknown>).flash as
          | Record<string, unknown>
          | undefined
        if (flash?.conflictData && flash?.conflictType === action.type) {
          const serverData = JSON.parse(flash.conflictData as string) as Record<string, unknown>
          conflictedAction.value = { action, serverData }
          isSyncing.value = false
          return
        }

        // Refus métier rendu en redirection (flash `error`) : côté Inertia
        // c'est un succès, l'action serait supprimée avec la saisie. Le marqueur
        // `rejectedType` la range dans `failed` comme un vrai 4xx (#622).
        if (flash?.rejectedType === action.type) {
          const reason: Record<string, string> =
            typeof flash.error === 'string' ? { reason: flash.error } : {}
          await moveToFailed(db, action, reason)
          if (action.tempId) {
            await cascadeDependentsToFailed(
              db,
              action.tempId,
              t('common.offline.failed.dependencyBlocked')
            )
          }
          await afterRejection()
          return
        }

        if (action.tempId) {
          const createdId =
            flash?.createdResourceType === action.type ? flash?.createdResourceId : undefined
          if (createdId) {
            await resolveTempId(db, action.tempId, String(createdId))
          } else {
            await cascadeDependentsToFailed(
              db,
              action.tempId,
              t('common.offline.failed.dependencyBlocked')
            )
          }
        }

        await db.delete(STORE_NAME, action.id!)
        await refreshCount()
        isSyncing.value = false
        if (pendingCount.value === 0) {
          toast.success(t('common.offline.syncSuccess', { count: String(totalCount) }))
        } else {
          await drainQueue()
        }
      },
      // Refus 4xx (validation…) : l'action part dans le store `failed` avec
      // les erreurs renvoyées — jamais détruite silencieusement (#487) — puis
      // la file continue avec l'action suivante.
      onError: async (errors: Record<string, string>) => {
        settled = true
        await moveToFailed(db, action, errors ?? {})
        if (action.tempId) {
          await cascadeDependentsToFailed(
            db,
            action.tempId,
            t('common.offline.failed.dependencyBlocked')
          )
        }
        await afterRejection()
      },
      // On 5xx or unexpected network error, onSuccess/onError are not called.
      // Keep the action in the queue and reset the guard so the next reconnect can retry.
      onFinish: () => {
        if (!settled) {
          isSyncing.value = false
        }
      },
    }

    if (action.method === 'patch') {
      router.patch(action.url, action.payload, callbacks)
    } else if (action.method === 'put') {
      router.put(action.url, action.payload, callbacks)
    } else {
      router.post(action.url, action.payload, callbacks)
    }
  }

  async function resolveConflict(choice: 'local' | 'server') {
    if (!conflictedAction.value || !isIndexedDbAvailable()) return
    const { action, serverData } = conflictedAction.value
    const db = await getDb()

    await db.delete(STORE_NAME, action.id!)

    if (choice === 'local') {
      const serverUpdatedAt = serverData.updatedAt as string
      await requeue(db, {
        ...action,
        payload: { ...action.payload, _expectedUpdatedAt: serverUpdatedAt },
      })
      toast.info(t('common.offline.conflict.kept'))
    } else {
      toast.info(t('common.offline.conflict.discarded'))
    }

    await refreshCount()
    conflictedAction.value = null
    if (pendingCount.value > 0) {
      await drainQueue()
    }
  }

  async function cancelAction(id: number) {
    if (!isIndexedDbAvailable()) return
    const db = await getDb()
    const action = (await db.get(STORE_NAME, id)) as QueuedAction | undefined
    // Annuler une création emporte ses actions filles : seules, elles rejoueraient
    // sur un jeton temporaire que plus rien ne résoudra (#622).
    if (action?.tempId) {
      const dependents = await dependentsOf(db, STORE_NAME, action.tempId)
      for (const dependent of dependents) {
        await db.delete(STORE_NAME, dependent.id!)
      }
    }
    await db.delete(STORE_NAME, id)
    await refreshCount()
    toast.info(t('common.offline.queue.cancelled'))
  }

  /**
   * Remet une action en échec dans la file d'attente, puis relance la synchro.
   * Une création et les actions qui la référencent forment un tout : reprendre
   * la fille seule la ferait rejouer sur un jeton temporaire (#622).
   */
  async function retryFailedAction(id: number) {
    if (!isIndexedDbAvailable()) return
    const db = await getDb()
    const failed = (await db.get(FAILED_STORE_NAME, id)) as FailedAction | undefined
    if (!failed) return

    const dependents = failed.tempId ? await dependentsOf(db, FAILED_STORE_NAME, failed.tempId) : []
    for (const item of [failed as QueuedAction, ...dependents]) {
      await requeue(db, item)
      await db.delete(FAILED_STORE_NAME, item.id!)
    }

    await refreshCount()
    toast.info(t('common.offline.failed.requeued'))
    await drainQueue()
  }

  /** Abandon explicite d'une action en échec — seule voie de suppression (#487). */
  async function discardFailedAction(id: number) {
    if (!isIndexedDbAvailable()) return
    const db = await getDb()
    const failed = (await db.get(FAILED_STORE_NAME, id)) as FailedAction | undefined
    if (failed?.tempId) {
      const dependents = await dependentsOf(db, FAILED_STORE_NAME, failed.tempId)
      for (const dependent of dependents) {
        await db.delete(FAILED_STORE_NAME, dependent.id!)
      }
    }
    await db.delete(FAILED_STORE_NAME, id)
    await refreshCount()
    toast.info(t('common.offline.failed.discarded'))
  }

  if (!countInitialized) {
    countInitialized = true
    refreshCount()
  }

  return {
    pendingCount,
    pendingActions,
    failedCount,
    failedActions,
    isSyncing,
    conflictedAction,
    enqueue,
    drainQueue,
    resolveConflict,
    cancelAction,
    retryFailedAction,
    discardFailedAction,
  }
}
