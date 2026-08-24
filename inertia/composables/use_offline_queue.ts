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
const DB_VERSION = 2

export interface QueuedAction {
  id?: number
  type: string
  url: string
  method: 'post' | 'patch' | 'put'
  payload: Record<string, unknown>
  createdAt: string
}

export interface FailedAction extends QueuedAction {
  failedAt: string
  errors: Record<string, string>
}

export interface ConflictState {
  action: QueuedAction
  serverData: Record<string, unknown>
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

export function useOfflineQueue() {
  const { t } = useT()
  const page = usePage()

  async function enqueue(action: Omit<QueuedAction, 'id' | 'createdAt'>) {
    if (!isIndexedDbAvailable()) return
    const db = await getDb()
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
        await db.delete(STORE_NAME, action.id)
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
        const { id, ...rest } = action
        await db.add(FAILED_STORE_NAME, {
          ...rest,
          failedAt: new Date().toISOString(),
          errors: errors ?? {},
        })
        await db.delete(STORE_NAME, id)
        await refreshCount()
        isSyncing.value = false
        toast.error(t('common.offline.syncRejected'))
        if (pendingCount.value > 0) {
          await drainQueue()
        }
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
    if (!conflictedAction.value) return
    const { action, serverData } = conflictedAction.value
    const db = await getDb()

    await db.delete(STORE_NAME, action.id!)

    if (choice === 'local') {
      const serverUpdatedAt = serverData.updatedAt as string
      await db.add(STORE_NAME, {
        type: action.type,
        url: action.url,
        method: action.method,
        payload: { ...action.payload, _expectedUpdatedAt: serverUpdatedAt },
        createdAt: action.createdAt,
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
    await db.delete(STORE_NAME, id)
    await refreshCount()
    toast.info(t('common.offline.queue.cancelled'))
  }

  /** Remet une action en échec dans la file d'attente, puis relance la synchro. */
  async function retryFailedAction(id: number) {
    if (!isIndexedDbAvailable()) return
    const db = await getDb()
    const failed = (await db.get(FAILED_STORE_NAME, id)) as FailedAction | undefined
    if (!failed) return
    await db.add(STORE_NAME, {
      type: failed.type,
      url: failed.url,
      method: failed.method,
      payload: failed.payload,
      createdAt: failed.createdAt,
    })
    await db.delete(FAILED_STORE_NAME, id)
    await refreshCount()
    toast.info(t('common.offline.failed.requeued'))
    await drainQueue()
  }

  /** Abandon explicite d'une action en échec — seule voie de suppression (#487). */
  async function discardFailedAction(id: number) {
    if (!isIndexedDbAvailable()) return
    const db = await getDb()
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
