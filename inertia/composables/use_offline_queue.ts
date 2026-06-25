import { router } from '@inertiajs/vue3'
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

async function refreshCount() {
  if (!isIndexedDbAvailable()) return
  const db = await getDb()
  pendingCount.value = await db.count(STORE_NAME)
}

export function useOfflineQueue() {
  const { t } = useT()

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

    const callbacks = {
      preserveScroll: true as const,
      onSuccess: async () => {
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
      // On server rejection the action is discarded to unblock the queue.
      // A persistent error here would block all subsequent entries indefinitely.
      onError: async () => {
        await db.delete(STORE_NAME, action.id)
        const remaining = await db.count(STORE_NAME)
        pendingCount.value = remaining
        isSyncing.value = false
        toast.error(t('offline.syncError'))
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

  refreshCount()

  return { pendingCount, isSyncing, enqueue, drainQueue }
}
