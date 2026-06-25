import { router, usePage } from '@inertiajs/vue3'
import { openDB } from 'idb'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { useT } from '~/composables/use_t'

const DB_NAME = 'fleetide-offline-queue'
const STORE_NAME = 'actions'

export interface QueuedAction {
  id?: number
  type: string
  url: string
  method: 'post' | 'patch' | 'put'
  payload: Record<string, unknown>
  createdAt: string
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
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    },
  })
}

// Module-level shared state — all composable instances share the same refs
const pendingCount = ref(0)
const isSyncing = ref(false)
export const conflictedAction = ref<ConflictState | null>(null)

async function refreshCount() {
  if (!isIndexedDbAvailable()) return
  const db = await getDb()
  pendingCount.value = await db.count(STORE_NAME)
}

export function useOfflineQueue() {
  const { t } = useT()
  const page = usePage()

  async function enqueue(action: Omit<QueuedAction, 'id' | 'createdAt'>) {
    if (!isIndexedDbAvailable()) return
    const db = await getDb()
    await db.add(STORE_NAME, { ...action, createdAt: new Date().toISOString() })
    await refreshCount()
    toast.info(t('offline.savedQueue'))
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
    toast.info(t('offline.syncing'))

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
        const remaining = await db.count(STORE_NAME)
        pendingCount.value = remaining
        isSyncing.value = false
        if (remaining === 0) {
          toast.success(t('offline.syncSuccess', { count: String(totalCount) }))
        } else {
          await drainQueue()
        }
      },
      // On validation rejection (4xx) the action is discarded to unblock the queue.
      onError: async () => {
        settled = true
        await db.delete(STORE_NAME, action.id)
        const remaining = await db.count(STORE_NAME)
        pendingCount.value = remaining
        isSyncing.value = false
        toast.error(t('offline.syncError'))
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
    pendingCount.value--

    if (choice === 'local') {
      const serverUpdatedAt = serverData.updatedAt as string
      await db.add(STORE_NAME, {
        type: action.type,
        url: action.url,
        method: action.method,
        payload: { ...action.payload, _expectedUpdatedAt: serverUpdatedAt },
        createdAt: action.createdAt,
      })
      pendingCount.value++
      toast.info(t('offline.conflict.kept'))
    } else {
      toast.info(t('offline.conflict.discarded'))
    }

    conflictedAction.value = null
    if (pendingCount.value > 0) {
      await drainQueue()
    }
  }

  refreshCount()

  return { pendingCount, isSyncing, conflictedAction, enqueue, drainQueue, resolveConflict }
}
