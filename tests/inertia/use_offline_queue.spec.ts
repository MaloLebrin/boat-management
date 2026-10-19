import { flushPromises, mount } from '@vue/test-utils'
import { IDBFactory } from 'fake-indexeddb'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('vue-sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const { requestPersistentStorage } = vi.hoisted(() => ({
  requestPersistentStorage: vi.fn().mockResolvedValue(true),
}))
vi.mock('~/composables/use_persistent_storage', () => ({ requestPersistentStorage }))

const mockPageProps = vi.hoisted(() => ({
  appT: {
    'common.offline.savedQueue': 'Enregistré hors-ligne',
    'common.offline.syncing': 'Synchronisation en cours…',
    'common.offline.syncSuccess':
      '{count, plural, one {# entrée synchronisée} other {# entrées synchronisées}}',
    'common.offline.syncSummary':
      'Synchronisation terminée : {synced} envoyée(s), {rejected} refusée(s), {conflicted} en conflit',
    'common.offline.conflict.keptAll': '{count} modifications seront renvoyées',
    'common.offline.conflict.discardedAll': '{count} modifications locales abandonnées',
    'common.offline.conflict.kept': 'Vos modifications seront renvoyées',
    'common.offline.conflict.discarded': 'Modifications locales abandonnées',
    'common.offline.queue.cancelled': 'Action annulée',
    'common.offline.failed.requeued': 'Action remise en file',
    'common.offline.failed.discarded': 'Action en échec abandonnée',
    'common.offline.failed.dependencyBlocked':
      "L'état des lieux auquel cette saisie est rattachée n'a pas pu être enregistré.",
    'common.offline.sessionExpired': 'Session expirée — reconnectez-vous pour synchroniser',
  },
  locale: 'fr',
  flash: {} as Record<string, unknown>,
  // Shared prop `user` (#950) : définie tant que la session est valide. Le
  // rejeu d'une action sur session expirée est redirigé vers /login, page
  // rendue **sans** `user` — c'est ce que la file doit détecter.
  user: { id: 1 } as { id: number } | undefined,
}))

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    usePage: vi.fn(() => ({ props: mockPageProps })),
    router: {
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
    },
  }
})

import { router } from '@inertiajs/vue3'
import { toast } from 'vue-sonner'
import {
  cancelScheduledRetry,
  conflicts,
  groupByDependency,
  newTempId,
  useOfflineQueue,
} from '../../inertia/composables/use_offline_queue'
import { OFFLINE_RETRY_BASE_MS } from '../../shared/helpers/offline_retry'

function mountComposable() {
  let result: ReturnType<typeof useOfflineQueue> | undefined

  mount(
    defineComponent({
      setup() {
        result = useOfflineQueue()
        return {}
      },
      template: '<div />',
    })
  )

  return result!
}

function makeRouterCallOnError(errors?: Record<string, string>) {
  vi.mocked(router.post).mockImplementation((_url, _data, options: any) => {
    options?.onError?.(errors)
    return undefined as any
  })
  vi.mocked(router.patch).mockImplementation((_url, _data, options: any) => {
    options?.onError?.(errors)
    return undefined as any
  })
  vi.mocked(router.put).mockImplementation((_url, _data, options: any) => {
    options?.onError?.(errors)
    return undefined as any
  })
}

function makeRouterCallOnFinishOnly() {
  vi.mocked(router.post).mockImplementation((_url, _data, options: any) => {
    options?.onFinish?.()
    return undefined as any
  })
  vi.mocked(router.patch).mockImplementation((_url, _data, options: any) => {
    options?.onFinish?.()
    return undefined as any
  })
  vi.mocked(router.put).mockImplementation((_url, _data, options: any) => {
    options?.onFinish?.()
    return undefined as any
  })
}

function makeRouterCallOnSuccess() {
  vi.mocked(router.post).mockImplementation((_url, _data, options: any) => {
    options?.onSuccess?.()
    return undefined as any
  })
  vi.mocked(router.patch).mockImplementation((_url, _data, options: any) => {
    options?.onSuccess?.()
    return undefined as any
  })
  vi.mocked(router.put).mockImplementation((_url, _data, options: any) => {
    options?.onSuccess?.()
    return undefined as any
  })
}

/** Le contrôleur a rendu l'ID réel de la ressource créée (#622). */
function makeRouterCallOnSuccessWithCreatedId(
  createdResourceType: string,
  createdResourceId: string
) {
  const impl = (_url: string, _data: unknown, options: any) => {
    mockPageProps.flash = { createdResourceType, createdResourceId }
    options?.onSuccess?.()
    return undefined as any
  }
  vi.mocked(router.post).mockImplementation(impl)
  vi.mocked(router.patch).mockImplementation(impl)
  vi.mocked(router.put).mockImplementation(impl)
}

/** Refus métier rendu en redirection : succès Inertia, mais `rejectedType` posé (#622). */
function makeRouterCallOnSuccessWithRejection(rejectedType: string, error: string) {
  const impl = (_url: string, _data: unknown, options: any) => {
    mockPageProps.flash = { rejectedType, error }
    options?.onSuccess?.()
    return undefined as any
  }
  vi.mocked(router.post).mockImplementation(impl)
  vi.mocked(router.patch).mockImplementation(impl)
  vi.mocked(router.put).mockImplementation(impl)
}

function makeRouterCallOnSuccessWithConflict(
  conflictType: string,
  serverData: Record<string, unknown>
) {
  const impl = (_url: string, _data: unknown, options: any) => {
    mockPageProps.flash = { conflictData: JSON.stringify(serverData), conflictType }
    options?.onSuccess?.()
    return undefined as any
  }
  vi.mocked(router.post).mockImplementation(impl)
  vi.mocked(router.patch).mockImplementation(impl)
  vi.mocked(router.put).mockImplementation(impl)
}

describe('useOfflineQueue', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.useRealTimers()
    cancelScheduledRetry()
    mockPageProps.flash = {}
    mockPageProps.user = { id: 1 }
    conflicts.value = []
    // L'état de suspension (#950) est module-level : un drain à vide sur une
    // session valide le remet à zéro entre deux tests. Il ouvre la base en v2,
    // d'où la factory IndexedDB fraîche **après** (test de migration v1 → v2).
    global.indexedDB = new IDBFactory()
    await mountComposable().drainQueue()
    global.indexedDB = new IDBFactory()
    vi.clearAllMocks()
  })

  test('enqueue adds item to IndexedDB and shows info toast', async () => {
    const { enqueue, pendingCount } = mountComposable()

    await enqueue({
      type: 'create-navigation-log',
      url: '/boats/1/navigation-logs',
      method: 'post',
      payload: { departedAt: '2026-06-24T10:00' },
    })

    expect(toast.info).toHaveBeenCalledOnce()
    expect(pendingCount.value).toBe(1)
  })

  test('enqueue increments pendingCount for each item', async () => {
    const { enqueue, pendingCount } = mountComposable()

    await enqueue({
      type: 'create-navigation-log',
      url: '/boats/1/navigation-logs',
      method: 'post',
      payload: { departedAt: '2026-06-24T10:00' },
    })
    await enqueue({
      type: 'create-fuel-log',
      url: '/boats/1/fuel-logs',
      method: 'post',
      payload: { quantityLiters: '50' },
    })

    expect(pendingCount.value).toBe(2)
  })

  test('drainQueue calls router.post for post method action', async () => {
    makeRouterCallOnSuccess()
    const { enqueue, drainQueue, pendingCount } = mountComposable()

    await enqueue({
      type: 'create-navigation-log',
      url: '/boats/1/navigation-logs',
      method: 'post',
      payload: { departedAt: '2026-06-24T10:00' },
    })

    await drainQueue()
    // Wait for the async onSuccess callback to fully complete
    await vi.waitFor(() => expect(pendingCount.value).toBe(0), { timeout: 1000 })

    expect(vi.mocked(router.post)).toHaveBeenCalledWith(
      '/boats/1/navigation-logs',
      { departedAt: '2026-06-24T10:00' },
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('drainQueue removes item from IDB and updates pendingCount on success', async () => {
    makeRouterCallOnSuccess()
    const { enqueue, drainQueue, pendingCount } = mountComposable()

    await enqueue({
      type: 'create-navigation-log',
      url: '/boats/1/navigation-logs',
      method: 'post',
      payload: { departedAt: '2026-06-24T10:00' },
    })
    expect(pendingCount.value).toBe(1)

    await drainQueue()

    await vi.waitFor(() => expect(pendingCount.value).toBe(0), { timeout: 1000 })
    expect(toast.success).toHaveBeenCalledOnce()
  })

  test('drainQueue calls router.patch for patch method action', async () => {
    makeRouterCallOnSuccess()
    const { enqueue, drainQueue, pendingCount } = mountComposable()

    await enqueue({
      type: 'update-navigation-log',
      url: '/boats/1/navigation-logs/5',
      method: 'patch',
      payload: { notes: 'updated' },
    })

    await drainQueue()
    // Wait for the async onSuccess callback to fully complete
    await vi.waitFor(() => expect(pendingCount.value).toBe(0), { timeout: 1000 })

    expect(vi.mocked(router.patch)).toHaveBeenCalledWith(
      '/boats/1/navigation-logs/5',
      { notes: 'updated' },
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('drainQueue does nothing when queue is empty', async () => {
    const { drainQueue } = mountComposable()

    await drainQueue()

    expect(vi.mocked(router.post)).not.toHaveBeenCalled()
    expect(vi.mocked(router.patch)).not.toHaveBeenCalled()
  })

  test('drainQueue calls router.put for put method action', async () => {
    makeRouterCallOnSuccess()
    const { enqueue, drainQueue, pendingCount } = mountComposable()

    await enqueue({
      type: 'update-fuel-log',
      url: '/boats/1/fuel-logs/3',
      method: 'put',
      payload: { quantityLiters: '60' },
    })

    await drainQueue()
    await vi.waitFor(() => expect(pendingCount.value).toBe(0), { timeout: 1000 })

    expect(vi.mocked(router.put)).toHaveBeenCalledWith(
      '/boats/1/fuel-logs/3',
      { quantityLiters: '60' },
      expect.objectContaining({ preserveScroll: true })
    )
  })

  // #487 — un refus 4xx déplace l'action vers `failed` au lieu de la détruire.
  test('drainQueue moves a 4xx-rejected action to the failed store with its errors', async () => {
    makeRouterCallOnError({ departedAt: 'La date de départ est invalide' })
    const { enqueue, drainQueue, pendingCount, failedCount, failedActions } = mountComposable()

    await enqueue({
      type: 'create-navigation-log',
      url: '/boats/1/navigation-logs',
      method: 'post',
      payload: { departedAt: 'invalid' },
    })
    expect(pendingCount.value).toBe(1)

    await drainQueue()
    await vi.waitFor(() => expect(pendingCount.value).toBe(0), { timeout: 1000 })

    expect(toast.error).toHaveBeenCalledOnce()
    expect(toast.success).not.toHaveBeenCalled()
    // L'action n'est pas détruite : payload et erreurs sont conservés
    expect(failedCount.value).toBe(1)
    expect(failedActions.value[0].type).toBe('create-navigation-log')
    expect(failedActions.value[0].payload).toEqual({ departedAt: 'invalid' })
    expect(failedActions.value[0].errors).toEqual({
      departedAt: 'La date de départ est invalide',
    })
    expect(failedActions.value[0].failedAt).toBeTruthy()
  })

  test('drainQueue keeps a failed action even without an errors object', async () => {
    makeRouterCallOnError()
    const { enqueue, drainQueue, pendingCount, failedCount, failedActions } = mountComposable()

    await enqueue({
      type: 'create-fuel-log',
      url: '/boats/1/fuel-logs',
      method: 'post',
      payload: { quantityLiters: '50' },
    })

    await drainQueue()
    await vi.waitFor(() => expect(pendingCount.value).toBe(0), { timeout: 1000 })

    expect(failedCount.value).toBe(1)
    expect(failedActions.value[0].errors).toEqual({})
  })

  test('a 4xx failure does not block the rest of the queue', async () => {
    // Première action refusée (422), la seconde passe
    vi.mocked(router.post)
      .mockImplementationOnce((_url, _data, options: any) => {
        options?.onError?.({ departedAt: 'invalide' })
        return undefined as any
      })
      .mockImplementationOnce((_url, _data, options: any) => {
        options?.onSuccess?.()
        return undefined as any
      })
    const { enqueue, drainQueue, pendingCount, failedCount } = mountComposable()

    await enqueue({
      type: 'create-navigation-log',
      url: '/boats/1/navigation-logs',
      method: 'post',
      payload: { departedAt: 'invalid' },
    })
    await enqueue({
      type: 'create-fuel-log',
      url: '/boats/1/fuel-logs',
      method: 'post',
      payload: { quantityLiters: '50' },
    })
    expect(pendingCount.value).toBe(2)

    await drainQueue()
    await vi.waitFor(() => expect(pendingCount.value).toBe(0), { timeout: 1000 })

    expect(failedCount.value).toBe(1)
    expect(vi.mocked(router.post)).toHaveBeenCalledTimes(2)
    // Bilan de passe (#970) : le refus n'est pas noyé dans un « tout est synchronisé ».
    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Synchronisation terminée : 1 envoyée(s), 1 refusée(s), 0 en conflit'
      )
    )
    expect(toast.success).not.toHaveBeenCalled()
  })

  test('retryFailedAction re-queues the action and keeps its payload', async () => {
    makeRouterCallOnError({ departedAt: 'invalide' })
    const { enqueue, drainQueue, pendingCount, failedCount, failedActions, retryFailedAction } =
      mountComposable()

    await enqueue({
      type: 'create-navigation-log',
      url: '/boats/1/navigation-logs',
      method: 'post',
      payload: { departedAt: 'invalid' },
    })
    await drainQueue()
    await vi.waitFor(() => expect(failedCount.value).toBe(1), { timeout: 1000 })

    // Le retry lui-même retombe en échec (mêmes données) — l'action revient en `failed`
    await retryFailedAction(failedActions.value[0].id!)
    await vi.waitFor(() => expect(failedCount.value).toBe(1), { timeout: 1000 })

    expect(pendingCount.value).toBe(0)
    expect(failedActions.value[0].payload).toEqual({ departedAt: 'invalid' })
    expect(toast.info).toHaveBeenCalledWith('Action remise en file')
  })

  test('discardFailedAction removes the failed action explicitly', async () => {
    makeRouterCallOnError({ departedAt: 'invalide' })
    const { enqueue, drainQueue, failedCount, failedActions, discardFailedAction } =
      mountComposable()

    await enqueue({
      type: 'create-navigation-log',
      url: '/boats/1/navigation-logs',
      method: 'post',
      payload: { departedAt: 'invalid' },
    })
    await drainQueue()
    await vi.waitFor(() => expect(failedCount.value).toBe(1), { timeout: 1000 })

    await discardFailedAction(failedActions.value[0].id!)

    expect(failedCount.value).toBe(0)
    expect(failedActions.value).toHaveLength(0)
    expect(toast.info).toHaveBeenLastCalledWith('Action en échec abandonnée')
  })

  // #490 — deux mises à jour du même item ne doivent pas s'empiler : la
  // seconde écraserait au rejeu les notes saisies entre les deux.
  test('enqueue with the same dedupeKey upserts instead of stacking', async () => {
    const { enqueue, pendingCount, pendingActions } = mountComposable()

    await enqueue({
      type: 'update-sheet-item',
      url: '/boats/1/maintenance-sheets/2/items/3',
      method: 'put',
      payload: { isDone: true, notes: '' },
      dedupeKey: 'update-sheet-item:/boats/1/maintenance-sheets/2/items/3',
    })
    await enqueue({
      type: 'update-sheet-item',
      url: '/boats/1/maintenance-sheets/2/items/3',
      method: 'put',
      payload: { isDone: false, notes: 'huile changée' },
      dedupeKey: 'update-sheet-item:/boats/1/maintenance-sheets/2/items/3',
    })

    expect(pendingCount.value).toBe(1)
    // La dernière valeur gagne
    expect(pendingActions.value[0].payload).toEqual({ isDone: false, notes: 'huile changée' })
    // Un seul toast : l'upsert ne renotifie pas chaque frappe
    expect(toast.info).toHaveBeenCalledTimes(1)
  })

  // #952 — la première saisie mise en file demande le stockage persistant ;
  // l'upsert d'une saisie déjà en file ne redemande rien.
  test('enqueue requests persistent storage on a new action, not on a dedupe upsert', async () => {
    const { enqueue } = mountComposable()
    const action = {
      type: 'update-sheet-item' as const,
      url: '/boats/1/maintenance-sheets/2/items/3',
      method: 'put' as const,
      payload: { isDone: true, notes: '' },
      dedupeKey: 'update-sheet-item:/boats/1/maintenance-sheets/2/items/3',
    }

    await enqueue(action)
    expect(requestPersistentStorage).toHaveBeenCalledOnce()

    await enqueue({ ...action, payload: { isDone: false, notes: '' } })
    expect(requestPersistentStorage).toHaveBeenCalledOnce()
  })

  test('enqueue with different dedupeKeys keeps separate actions', async () => {
    const { enqueue, pendingCount } = mountComposable()

    await enqueue({
      type: 'update-sheet-item',
      url: '/boats/1/maintenance-sheets/2/items/3',
      method: 'put',
      payload: { isDone: true, notes: '' },
      dedupeKey: 'update-sheet-item:/boats/1/maintenance-sheets/2/items/3',
    })
    await enqueue({
      type: 'update-sheet-item',
      url: '/boats/1/maintenance-sheets/2/items/4',
      method: 'put',
      payload: { isDone: true, notes: '' },
      dedupeKey: 'update-sheet-item:/boats/1/maintenance-sheets/2/items/4',
    })

    expect(pendingCount.value).toBe(2)
  })

  test('dedupe upsert keeps the original FIFO position', async () => {
    const { enqueue, pendingActions } = mountComposable()

    await enqueue({
      type: 'update-sheet-item',
      url: '/boats/1/maintenance-sheets/2/items/3',
      method: 'put',
      payload: { isDone: true, notes: '' },
      dedupeKey: 'update-sheet-item:/boats/1/maintenance-sheets/2/items/3',
    })
    await enqueue({
      type: 'create-fuel-log',
      url: '/boats/1/fuel-logs',
      method: 'post',
      payload: { quantityLiters: '50' },
    })
    await enqueue({
      type: 'update-sheet-item',
      url: '/boats/1/maintenance-sheets/2/items/3',
      method: 'put',
      payload: { isDone: false, notes: 'v2' },
      dedupeKey: 'update-sheet-item:/boats/1/maintenance-sheets/2/items/3',
    })

    expect(pendingActions.value.map((a) => a.type)).toEqual([
      'update-sheet-item',
      'create-fuel-log',
    ])
    expect(pendingActions.value[0].payload).toEqual({ isDone: false, notes: 'v2' })
  })

  test('v1 → v2 migration preserves the existing pending queue', async () => {
    // Base v1 telle qu'elle existe chez les utilisateurs actuels
    const { openDB } = await import('idb')
    const v1 = await openDB('fleetide-offline-queue', 1, {
      upgrade(db) {
        db.createObjectStore('actions', { keyPath: 'id', autoIncrement: true })
      },
    })
    await v1.add('actions', {
      type: 'create-navigation-log',
      url: '/boats/1/navigation-logs',
      method: 'post',
      payload: { departedAt: '2026-06-24T10:00' },
      createdAt: '2026-06-24T10:00:00.000Z',
    })
    v1.close()

    // L'ouverture en v2 (via enqueue) ne doit pas perdre la file existante
    const { enqueue, pendingCount, pendingActions, failedCount } = mountComposable()
    await enqueue({
      type: 'create-fuel-log',
      url: '/boats/1/fuel-logs',
      method: 'post',
      payload: { quantityLiters: '50' },
    })

    expect(pendingCount.value).toBe(2)
    expect(pendingActions.value.map((a) => a.type)).toEqual([
      'create-navigation-log',
      'create-fuel-log',
    ])
    expect(failedCount.value).toBe(0)
  })

  test('drainQueue shows syncing toast when starting drain', async () => {
    makeRouterCallOnSuccess()
    const { enqueue, drainQueue, pendingCount } = mountComposable()

    await enqueue({
      type: 'create-navigation-log',
      url: '/boats/1/navigation-logs',
      method: 'post',
      payload: { departedAt: '2026-06-24T10:00' },
    })

    await drainQueue()
    await vi.waitFor(() => expect(pendingCount.value).toBe(0), { timeout: 1000 })

    expect(toast.info).toHaveBeenCalledWith('Synchronisation en cours…')
  })

  test('drainQueue keeps action in queue and resets isSyncing on 5xx / network error', async () => {
    makeRouterCallOnFinishOnly()
    const { enqueue, drainQueue, pendingCount, isSyncing } = mountComposable()

    await enqueue({
      type: 'create-navigation-log',
      url: '/boats/1/navigation-logs',
      method: 'post',
      payload: { departedAt: '2026-06-24T10:00' },
    })
    expect(pendingCount.value).toBe(1)

    await drainQueue()
    await flushPromises()

    // Action stays in queue for the next retry
    expect(pendingCount.value).toBe(1)
    // isSyncing is reset so future drainQueue calls are not blocked
    expect(isSyncing.value).toBe(false)
    // No discard toast — the error is transient
    expect(toast.error).not.toHaveBeenCalled()
  })

  test('drainQueue prevents concurrent calls when already syncing', async () => {
    const { drainQueue, isSyncing } = mountComposable()

    // Directly set the module-level guard as if a drain is in progress
    isSyncing.value = true

    await drainQueue()

    expect(vi.mocked(router.post)).not.toHaveBeenCalled()
    expect(vi.mocked(router.patch)).not.toHaveBeenCalled()
    expect(vi.mocked(router.put)).not.toHaveBeenCalled()

    // Reset module-level state so it doesn't leak to other tests
    isSyncing.value = false
  })

  test('drainQueue sets the conflict aside, keeps the action and reports it', async () => {
    const serverData = { id: 5, updatedAt: '2026-06-25T12:00:00.000Z', notes: 'Serveur' }
    makeRouterCallOnSuccessWithConflict('update-navigation-log', serverData)
    const { enqueue, drainQueue, pendingCount } = mountComposable()

    await enqueue({
      type: 'update-navigation-log',
      url: '/boats/1/navigation-logs/5',
      method: 'patch',
      payload: { notes: 'Local', _expectedUpdatedAt: '2026-06-25T10:00:00.000Z' },
    })
    expect(pendingCount.value).toBe(1)

    await drainQueue()
    await flushPromises()

    // Action stays in queue (not deleted)
    expect(pendingCount.value).toBe(1)
    expect(conflicts.value).toHaveLength(1)
    expect(conflicts.value[0].action.type).toBe('update-navigation-log')
    expect(conflicts.value[0].serverData).toEqual(serverData)
    await vi.waitFor(() =>
      expect(toast.info).toHaveBeenCalledWith(
        'Synchronisation terminée : 0 envoyée(s), 0 refusée(s), 1 en conflit'
      )
    )
    expect(toast.error).not.toHaveBeenCalled()
  })

  // #970 — après une longue coupure, un conflit ne bloque plus la file.
  test('a conflict no longer blocks the actions queued after it', async () => {
    const impl = (url: string, _data: unknown, options: any) => {
      mockPageProps.flash = url.endsWith('/5')
        ? {
            conflictType: 'update-navigation-log',
            conflictData: JSON.stringify({ id: 5, updatedAt: 'x', notes: 'Serveur' }),
          }
        : {}
      options?.onSuccess?.()
      return undefined as any
    }
    vi.mocked(router.post).mockImplementation(impl)
    vi.mocked(router.patch).mockImplementation(impl)
    const { enqueue, drainQueue, pendingCount } = mountComposable()

    await enqueue({
      type: 'update-navigation-log',
      url: '/boats/1/navigation-logs/5',
      method: 'patch',
      payload: { notes: 'Local' },
    })
    await enqueue({
      type: 'create-fuel-log',
      url: '/boats/1/fuel-logs',
      method: 'post',
      payload: { quantityLiters: '40' },
    })
    await enqueue({
      type: 'update-navigation-log',
      url: '/boats/2/navigation-logs/5',
      method: 'patch',
      payload: { notes: 'Autre bateau' },
    })

    await drainQueue()
    await vi.waitFor(() => expect(conflicts.value).toHaveLength(2), { timeout: 1000 })
    await vi.waitFor(() => expect(toast.info).toHaveBeenCalledTimes(5))
    expect(pendingCount.value).toBe(2)

    expect(vi.mocked(router.post)).toHaveBeenCalledWith(
      '/boats/1/fuel-logs',
      expect.anything(),
      expect.anything()
    )
    expect(conflicts.value.map((c) => c.action.url)).toEqual([
      '/boats/1/navigation-logs/5',
      '/boats/2/navigation-logs/5',
    ])
    // Un seul bilan pour toute la passe, pas un toast par action.
    expect(toast.info).toHaveBeenCalledWith(
      'Synchronisation terminée : 1 envoyée(s), 0 refusée(s), 2 en conflit'
    )
    expect(
      vi.mocked(toast.info).mock.calls.filter(([m]) => m === 'Synchronisation en cours…')
    ).toHaveLength(1)

    // Une nouvelle passe ne rejoue pas les conflits en attente d'arbitrage.
    vi.mocked(router.patch).mockClear()
    await drainQueue()
    await flushPromises()
    expect(vi.mocked(router.patch)).not.toHaveBeenCalled()
  })

  test('resolveConflict(id, "server") discards action and decrements pendingCount', async () => {
    const serverData = { id: 5, updatedAt: '2026-06-25T12:00:00.000Z', notes: 'Serveur' }
    makeRouterCallOnSuccessWithConflict('update-navigation-log', serverData)
    const { enqueue, drainQueue, pendingCount, resolveConflict } = mountComposable()

    await enqueue({
      type: 'update-navigation-log',
      url: '/boats/1/navigation-logs/5',
      method: 'patch',
      payload: { notes: 'Local', _expectedUpdatedAt: '2026-06-25T10:00:00.000Z' },
    })
    await drainQueue()
    await flushPromises()
    expect(conflicts.value).toHaveLength(1)

    await resolveConflict(conflicts.value[0].action.id!, 'server')
    await flushPromises()

    expect(pendingCount.value).toBe(0)
    expect(conflicts.value).toEqual([])
    expect(toast.info).toHaveBeenCalledWith('Modifications locales abandonnées')
  })

  test('resolveConflict(id, "local") re-enqueues with server updatedAt as new _expectedUpdatedAt', async () => {
    const serverData = {
      id: 5,
      updatedAt: '2026-06-25T12:00:00.000Z',
      notes: 'Serveur',
    }
    makeRouterCallOnSuccessWithConflict('update-navigation-log', serverData)
    const { enqueue, drainQueue, pendingCount, resolveConflict } = mountComposable()

    await enqueue({
      type: 'update-navigation-log',
      url: '/boats/1/navigation-logs/5',
      method: 'patch',
      payload: { notes: 'Local', _expectedUpdatedAt: '2026-06-25T10:00:00.000Z' },
    })
    await drainQueue()
    await flushPromises()
    expect(conflicts.value).toHaveLength(1)

    // Switch to normal success for the re-drain after resolving
    makeRouterCallOnSuccess()
    mockPageProps.flash = {}

    await resolveConflict(conflicts.value[0].action.id!, 'local')
    await flushPromises()

    // pendingCount should be 0 after re-drain succeeded
    await vi.waitFor(() => expect(pendingCount.value).toBe(0), { timeout: 1000 })
    expect(conflicts.value).toEqual([])
    expect(toast.info).toHaveBeenCalledWith('Vos modifications seront renvoyées')

    // Re-submitted with server's updatedAt as the new expected value
    expect(vi.mocked(router.patch)).toHaveBeenCalledWith(
      '/boats/1/navigation-logs/5',
      expect.objectContaining({ _expectedUpdatedAt: '2026-06-25T12:00:00.000Z' }),
      expect.any(Object)
    )
  })

  describe('résolution en lot (#970)', () => {
    async function drainIntoTwoConflicts() {
      const impl = (url: string, _data: unknown, options: any) => {
        mockPageProps.flash = {
          conflictType: 'update-navigation-log',
          conflictData: JSON.stringify({ id: 5, updatedAt: `server:${url}`, notes: 'Serveur' }),
        }
        options?.onSuccess?.()
        return undefined as any
      }
      vi.mocked(router.patch).mockImplementation(impl)
      const queue = mountComposable()
      for (const boatId of [1, 2]) {
        await queue.enqueue({
          type: 'update-navigation-log',
          url: `/boats/${boatId}/navigation-logs/5`,
          method: 'patch',
          payload: { notes: 'Local' },
        })
      }
      await queue.drainQueue()
      await vi.waitFor(() => expect(conflicts.value).toHaveLength(2), { timeout: 1000 })
      await flushPromises()
      vi.clearAllMocks()
      return queue
    }

    test('« garder le serveur partout » abandonne toutes les versions locales', async () => {
      const { resolveAllConflicts, pendingCount } = await drainIntoTwoConflicts()

      await resolveAllConflicts('server')
      await flushPromises()

      expect(conflicts.value).toEqual([])
      expect(pendingCount.value).toBe(0)
      expect(vi.mocked(router.patch)).not.toHaveBeenCalled()
      expect(toast.info).toHaveBeenCalledWith('2 modifications locales abandonnées')
    })

    test('« garder ma version partout » rejoue chaque action avec son nouveau jeton', async () => {
      const { resolveAllConflicts, pendingCount } = await drainIntoTwoConflicts()
      makeRouterCallOnSuccess()
      mockPageProps.flash = {}

      await resolveAllConflicts('local')
      await vi.waitFor(() => expect(pendingCount.value).toBe(0), { timeout: 1000 })

      expect(conflicts.value).toEqual([])
      expect(toast.info).toHaveBeenCalledWith('2 modifications seront renvoyées')
      expect(vi.mocked(router.patch)).toHaveBeenCalledWith(
        '/boats/1/navigation-logs/5',
        expect.objectContaining({ _expectedUpdatedAt: 'server:/boats/1/navigation-logs/5' }),
        expect.any(Object)
      )
      expect(vi.mocked(router.patch)).toHaveBeenCalledWith(
        '/boats/2/navigation-logs/5',
        expect.objectContaining({ _expectedUpdatedAt: 'server:/boats/2/navigation-logs/5' }),
        expect.any(Object)
      )
    })

    test('trancher un conflit laisse les autres en attente, sans relancer la file', async () => {
      const { resolveConflict, pendingCount } = await drainIntoTwoConflicts()

      await resolveConflict(conflicts.value[0].action.id!, 'server')
      await flushPromises()

      expect(conflicts.value.map((c) => c.action.url)).toEqual(['/boats/2/navigation-logs/5'])
      expect(pendingCount.value).toBe(1)
      expect(vi.mocked(router.patch)).not.toHaveBeenCalled()
    })

    test('annuler une action en conflit la retire de la liste à arbitrer', async () => {
      const { cancelAction } = await drainIntoTwoConflicts()

      await cancelAction(conflicts.value[1].action.id!)

      expect(conflicts.value.map((c) => c.action.url)).toEqual(['/boats/1/navigation-logs/5'])
    })
  })

  test('enqueue populates pendingActions with the queued item', async () => {
    const { enqueue, pendingActions } = mountComposable()

    await enqueue({
      type: 'create-navigation-log',
      url: '/boats/1/navigation-logs',
      method: 'post',
      payload: { departedAt: '2026-06-24T10:00' },
    })

    expect(pendingActions.value).toHaveLength(1)
    expect(pendingActions.value[0].type).toBe('create-navigation-log')
    expect(pendingActions.value[0].url).toBe('/boats/1/navigation-logs')
  })

  test('enqueue appends to pendingActions for each item', async () => {
    const { enqueue, pendingActions } = mountComposable()

    await enqueue({
      type: 'create-navigation-log',
      url: '/boats/1/navigation-logs',
      method: 'post',
      payload: { departedAt: '2026-06-24T10:00' },
    })
    await enqueue({
      type: 'create-fuel-log',
      url: '/boats/1/fuel-logs',
      method: 'post',
      payload: { quantityLiters: '50' },
    })

    expect(pendingActions.value).toHaveLength(2)
    expect(pendingActions.value.map((a) => a.type)).toEqual([
      'create-navigation-log',
      'create-fuel-log',
    ])
  })

  test('cancelAction removes item from queue and shows info toast', async () => {
    const { enqueue, cancelAction, pendingCount, pendingActions } = mountComposable()

    await enqueue({
      type: 'create-navigation-log',
      url: '/boats/1/navigation-logs',
      method: 'post',
      payload: { departedAt: '2026-06-24T10:00' },
    })
    expect(pendingCount.value).toBe(1)
    const id = pendingActions.value[0].id!

    await cancelAction(id)

    expect(pendingCount.value).toBe(0)
    expect(pendingActions.value).toHaveLength(0)
    expect(toast.info).toHaveBeenLastCalledWith('Action annulée')
  })

  test('cancelAction removes only the targeted item when multiple are queued', async () => {
    const { enqueue, cancelAction, pendingCount, pendingActions } = mountComposable()

    await enqueue({
      type: 'create-navigation-log',
      url: '/boats/1/navigation-logs',
      method: 'post',
      payload: { departedAt: '2026-06-24T10:00' },
    })
    await enqueue({
      type: 'create-fuel-log',
      url: '/boats/1/fuel-logs',
      method: 'post',
      payload: { quantityLiters: '50' },
    })
    const firstId = pendingActions.value[0].id!

    await cancelAction(firstId)

    expect(pendingCount.value).toBe(1)
    expect(pendingActions.value[0].type).toBe('create-fuel-log')
  })

  // #950 — une session expirée pendant la traversée : le rejeu est redirigé
  // vers /login, qu'Inertia rend comme un succès. La file ne doit rien
  // supprimer tant que la shared prop `user` n'est pas revenue.
  describe('session expirée pendant le rejeu (#950)', () => {
    /** Redirection /login suivie par Inertia : `onSuccess` sur une page sans `user`. */
    function makeRouterCallOnSuccessAsLoggedOut() {
      const impl = (_url: string, _data: unknown, options: any) => {
        mockPageProps.user = undefined
        options?.onSuccess?.()
        return undefined as any
      }
      vi.mocked(router.post).mockImplementation(impl)
      vi.mocked(router.patch).mockImplementation(impl)
      vi.mocked(router.put).mockImplementation(impl)
    }

    test('a redirect to /login keeps the action in the queue and suspends the drain', async () => {
      makeRouterCallOnSuccessAsLoggedOut()
      const { enqueue, drainQueue, pendingCount, isSyncing, suspendedReason } = mountComposable()

      await enqueue({
        type: 'create-navigation-log',
        url: '/boats/1/navigation-logs',
        method: 'post',
        payload: { departedAt: '2026-06-24T10:00' },
      })

      await drainQueue()
      await flushPromises()

      expect(pendingCount.value).toBe(1)
      expect(isSyncing.value).toBe(false)
      expect(suspendedReason.value).toBe('auth')
      expect(toast.success).not.toHaveBeenCalled()
      expect(toast.error).toHaveBeenCalledWith(
        'Session expirée — reconnectez-vous pour synchroniser'
      )
    })

    test('drainQueue does not hit the network while the user is logged out', async () => {
      mockPageProps.user = undefined
      makeRouterCallOnSuccess()
      const { enqueue, drainQueue, pendingCount, suspendedReason } = mountComposable()

      await enqueue({
        type: 'create-fuel-log',
        url: '/boats/1/fuel-logs',
        method: 'post',
        payload: { quantityLiters: '50' },
      })

      await drainQueue()
      await flushPromises()

      expect(router.post).not.toHaveBeenCalled()
      expect(pendingCount.value).toBe(1)
      expect(suspendedReason.value).toBe('auth')
    })

    test('the drain resumes once the user is back and clears the suspension', async () => {
      makeRouterCallOnSuccessAsLoggedOut()
      const { enqueue, drainQueue, pendingCount, suspendedReason } = mountComposable()

      await enqueue({
        type: 'create-fuel-log',
        url: '/boats/1/fuel-logs',
        method: 'post',
        payload: { quantityLiters: '50' },
      })
      await drainQueue()
      await flushPromises()
      expect(suspendedReason.value).toBe('auth')

      // Reconnexion : la page rend à nouveau `user`, le rejeu aboutit.
      mockPageProps.user = { id: 1 }
      makeRouterCallOnSuccess()
      await drainQueue()
      await vi.waitFor(() => expect(pendingCount.value).toBe(0), { timeout: 1000 })

      expect(suspendedReason.value).toBeNull()
      expect(toast.success).toHaveBeenCalledOnce()
    })

    test('a logged-out parent creation does not cascade its dependents to failed', async () => {
      makeRouterCallOnSuccessAsLoggedOut()
      const { enqueue, drainQueue, pendingCount, failedCount } = mountComposable()

      await enqueue({
        type: 'create-inspection',
        url: '/boats/1/reservations/2/inspections',
        method: 'post',
        payload: { kind: 'checkout' },
        tempId: 'tmp_abc',
      })
      await enqueue({
        type: 'create-inspection-defect',
        url: '/boats/1/reservations/2/inspections/tmp_abc/equipment-actions',
        method: 'post',
        payload: { note: 'x' },
        dependsOn: 'tmp_abc',
      })

      await drainQueue()
      await flushPromises()

      expect(pendingCount.value).toBe(2)
      expect(failedCount.value).toBe(0)
    })
  })

  // #950 — sur 5xx/réseau, la file ne doit pas marteler un lien satellite
  // dégradé : relance différée avec délai exponentiel plafonné.
  describe('relance différée après erreur transitoire (#950)', () => {
    /** fake-indexeddb planifie sur `setImmediate` : ne simuler que les timeouts. */
    function useTimeoutFakeTimers() {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    }

    /**
     * Avance l'horloge simulée puis laisse passer les macrotâches réelles :
     * la relance appelle `drainQueue`, qui lit IndexedDB (`setImmediate`)
     * avant d'atteindre `router.*`.
     */
    async function advanceAndSettle(ms: number) {
      await vi.advanceTimersByTimeAsync(ms)
      for (let i = 0; i < 20; i++) {
        await new Promise<void>((resolve) => setImmediate(resolve))
      }
    }

    test('a transient failure schedules a retry with exponential backoff', async () => {
      useTimeoutFakeTimers()
      makeRouterCallOnFinishOnly()
      const { enqueue, drainQueue, retryAttempt } = mountComposable()

      await enqueue({
        type: 'create-fuel-log',
        url: '/boats/1/fuel-logs',
        method: 'post',
        payload: { quantityLiters: '50' },
      })

      await drainQueue()
      await advanceAndSettle(0)
      expect(router.post).toHaveBeenCalledTimes(1)
      expect(retryAttempt.value).toBe(1)

      // Pas de relance avant le délai de base
      await advanceAndSettle(OFFLINE_RETRY_BASE_MS - 1)
      expect(router.post).toHaveBeenCalledTimes(1)

      await advanceAndSettle(1)
      expect(router.post).toHaveBeenCalledTimes(2)
      expect(retryAttempt.value).toBe(2)

      // Deuxième relance : délai doublé
      await advanceAndSettle(OFFLINE_RETRY_BASE_MS * 2)
      expect(router.post).toHaveBeenCalledTimes(3)
    })

    test('a successful replay resets the backoff', async () => {
      useTimeoutFakeTimers()
      makeRouterCallOnFinishOnly()
      const { enqueue, drainQueue, retryAttempt, pendingCount } = mountComposable()

      await enqueue({
        type: 'create-fuel-log',
        url: '/boats/1/fuel-logs',
        method: 'post',
        payload: { quantityLiters: '50' },
      })
      await drainQueue()
      await advanceAndSettle(0)
      expect(retryAttempt.value).toBe(1)

      makeRouterCallOnSuccess()
      await advanceAndSettle(OFFLINE_RETRY_BASE_MS)
      await advanceAndSettle(0)

      expect(pendingCount.value).toBe(0)
      expect(retryAttempt.value).toBe(0)
    })

    test('cancelScheduledRetry drops the pending timer', async () => {
      useTimeoutFakeTimers()
      makeRouterCallOnFinishOnly()
      const { enqueue, drainQueue } = mountComposable()

      await enqueue({
        type: 'create-fuel-log',
        url: '/boats/1/fuel-logs',
        method: 'post',
        payload: { quantityLiters: '50' },
      })
      await drainQueue()
      await advanceAndSettle(0)
      expect(router.post).toHaveBeenCalledTimes(1)

      cancelScheduledRetry()
      await advanceAndSettle(OFFLINE_RETRY_BASE_MS * 10)
      expect(router.post).toHaveBeenCalledTimes(1)
    })

    test('a scheduled retry is skipped while the browser reports offline', async () => {
      useTimeoutFakeTimers()
      makeRouterCallOnFinishOnly()
      const { enqueue, drainQueue } = mountComposable()

      await enqueue({
        type: 'create-fuel-log',
        url: '/boats/1/fuel-logs',
        method: 'post',
        payload: { quantityLiters: '50' },
      })
      await drainQueue()
      await advanceAndSettle(0)
      expect(router.post).toHaveBeenCalledTimes(1)

      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      })
      await advanceAndSettle(OFFLINE_RETRY_BASE_MS)
      expect(router.post).toHaveBeenCalledTimes(1)
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      })
    })
  })

  // #622 — une création hors-ligne porte un jeton temporaire, les actions qui la
  // référencent ne sont rejouables qu'une fois l'ID réel connu.
  describe('dépendances entre actions (#622)', () => {
    const TEMP_ID = 'tmp_inspection1'
    const CREATE_URL = '/boats/1/reservations/2/inspections'
    const DEFECT_URL = `/boats/1/reservations/2/inspections/${TEMP_ID}/equipment-actions`

    async function enqueueInspectionWithDefect(
      enqueue: ReturnType<typeof mountComposable>['enqueue']
    ) {
      await enqueue({
        type: 'create-inspection',
        url: CREATE_URL,
        method: 'post',
        payload: { kind: 'checkout', performedAt: '2026-09-02T10:00' },
        tempId: TEMP_ID,
      })
      await enqueue({
        type: 'create-inspection-defect',
        url: DEFECT_URL,
        method: 'post',
        payload: { label: 'Taquet arraché', actionType: 'to_repair', inspectionId: TEMP_ID },
        dependsOn: TEMP_ID,
      })
    }

    test('newTempId produces a non-numeric token', () => {
      const id = newTempId()
      expect(id.startsWith('tmp_')).toBe(true)
      expect(Number.isFinite(Number(id))).toBe(false)
      expect(newTempId()).not.toBe(id)
    })

    test('the created id rewrites the dependent url and clears dependsOn', async () => {
      // La fille est laissée en file après réécriture (le rejeu ne « settle »
      // pas), pour pouvoir observer sa forme résolue.
      makeRouterCallOnFinishOnly()
      vi.mocked(router.post).mockImplementationOnce((_url, _data, options: any) => {
        mockPageProps.flash = { createdResourceType: 'create-inspection', createdResourceId: '42' }
        options?.onSuccess?.()
        return undefined as any
      })
      const { enqueue, drainQueue, pendingActions } = mountComposable()
      await enqueueInspectionWithDefect(enqueue)

      await drainQueue()

      await vi.waitFor(() => expect(pendingActions.value).toHaveLength(1), { timeout: 1000 })
      const dependent = pendingActions.value[0]
      expect(dependent.url).toBe('/boats/1/reservations/2/inspections/42/equipment-actions')
      expect(dependent.dependsOn).toBeUndefined()
      expect(dependent.payload.inspectionId).toBe(42)
      // Et la fille est bien rejouée sur l'URL réelle, pas sur le jeton.
      expect(vi.mocked(router.post).mock.calls.at(-1)?.[0]).toBe(
        '/boats/1/reservations/2/inspections/42/equipment-actions'
      )
    })

    test('a 4xx on the parent cascades its dependents to the failed store', async () => {
      makeRouterCallOnError({ performedAt: 'Date invalide' })
      const { enqueue, drainQueue, pendingCount, failedActions } = mountComposable()
      await enqueueInspectionWithDefect(enqueue)

      await drainQueue()

      await vi.waitFor(() => expect(failedActions.value).toHaveLength(2), { timeout: 1000 })
      expect(pendingCount.value).toBe(0)
      const dependent = failedActions.value.find((a) => a.type === 'create-inspection-defect')
      // `dependsOn` est conservé : c'est ce qui permet la reprise groupée.
      expect(dependent?.dependsOn).toBe(TEMP_ID)
      expect(dependent?.errors.dependency).toContain('état des lieux')
      // Le payload de la saisie est intact — rien n'est détruit (#487).
      expect(dependent?.payload.label).toBe('Taquet arraché')
    })

    test('a business refusal flashed as a redirect is kept instead of being deleted', async () => {
      makeRouterCallOnSuccessWithRejection('create-inspection', 'Un état des lieux existe déjà')
      const { enqueue, drainQueue, pendingCount, failedActions } = mountComposable()
      await enqueueInspectionWithDefect(enqueue)

      await drainQueue()

      await vi.waitFor(() => expect(failedActions.value).toHaveLength(2), { timeout: 1000 })
      expect(pendingCount.value).toBe(0)
      const creation = failedActions.value.find((a) => a.type === 'create-inspection')
      expect(creation?.errors.reason).toBe('Un état des lieux existe déjà')
      expect(toast.error).toHaveBeenCalled()
    })

    test('a rejectedType meant for another action type is ignored', async () => {
      makeRouterCallOnSuccessWithRejection('create-fuel-log', 'Refus sans rapport')
      const { enqueue, drainQueue, pendingCount, failedCount } = mountComposable()

      await enqueue({
        type: 'create-navigation-log',
        url: '/boats/1/navigation-logs',
        method: 'post',
        payload: { departedAt: '2026-06-24T10:00' },
      })
      await drainQueue()

      await vi.waitFor(() => expect(pendingCount.value).toBe(0), { timeout: 1000 })
      expect(failedCount.value).toBe(0)
    })

    test('a success without a created id fails the dependents rather than replaying them', async () => {
      makeRouterCallOnSuccess()
      const { enqueue, drainQueue, pendingCount, failedActions } = mountComposable()
      await enqueueInspectionWithDefect(enqueue)

      await drainQueue()

      await vi.waitFor(() => expect(failedActions.value).toHaveLength(1), { timeout: 1000 })
      expect(failedActions.value[0].type).toBe('create-inspection-defect')
      expect(pendingCount.value).toBe(0)
    })

    test('retryFailedAction re-queues the whole group, parent first', async () => {
      makeRouterCallOnError({ performedAt: 'Date invalide' })
      const { enqueue, drainQueue, failedActions, retryFailedAction, pendingActions } =
        mountComposable()
      await enqueueInspectionWithDefect(enqueue)
      await drainQueue()
      await vi.waitFor(() => expect(failedActions.value).toHaveLength(2), { timeout: 1000 })

      // La reprise ne doit pas rejouer immédiatement : on neutralise le routeur.
      makeRouterCallOnFinishOnly()
      const creationId = failedActions.value.find((a) => a.type === 'create-inspection')!.id!
      await retryFailedAction(creationId)

      await vi.waitFor(() => expect(pendingActions.value).toHaveLength(2), { timeout: 1000 })
      expect(failedActions.value).toHaveLength(0)
      expect(pendingActions.value[0].type).toBe('create-inspection')
      expect(pendingActions.value[0].tempId).toBe(TEMP_ID)
      expect(pendingActions.value[1].dependsOn).toBe(TEMP_ID)
    })

    test('discardFailedAction drops the whole group', async () => {
      makeRouterCallOnError({ performedAt: 'Date invalide' })
      const { enqueue, drainQueue, failedActions, discardFailedAction } = mountComposable()
      await enqueueInspectionWithDefect(enqueue)
      await drainQueue()
      await vi.waitFor(() => expect(failedActions.value).toHaveLength(2), { timeout: 1000 })

      const creationId = failedActions.value.find((a) => a.type === 'create-inspection')!.id!
      await discardFailedAction(creationId)

      expect(failedActions.value).toHaveLength(0)
    })

    test('cancelAction on a pending creation also drops its dependents', async () => {
      const { enqueue, cancelAction, pendingActions, pendingCount } = mountComposable()
      await enqueueInspectionWithDefect(enqueue)

      const creationId = pendingActions.value.find((a) => a.type === 'create-inspection')!.id!
      await cancelAction(creationId)

      expect(pendingCount.value).toBe(0)
    })

    test('re-enqueuing the creation keeps its temp id so defects stay attached', async () => {
      const { enqueue, pendingActions } = mountComposable()
      await enqueue({
        type: 'create-inspection',
        url: CREATE_URL,
        method: 'post',
        payload: { kind: 'checkout', performedAt: '2026-09-02T10:00' },
        dedupeKey: `create-inspection:${CREATE_URL}:checkout`,
        tempId: TEMP_ID,
      })
      await enqueue({
        type: 'create-inspection',
        url: CREATE_URL,
        method: 'post',
        payload: { kind: 'checkout', performedAt: '2026-09-02T11:30' },
        dedupeKey: `create-inspection:${CREATE_URL}:checkout`,
        tempId: 'tmp_other',
      })

      expect(pendingActions.value).toHaveLength(1)
      expect(pendingActions.value[0].tempId).toBe(TEMP_ID)
      expect(pendingActions.value[0].payload.performedAt).toBe('2026-09-02T11:30')
    })

    test('groupByDependency nests dependents and keeps orphans standalone', () => {
      const groups = groupByDependency([
        {
          id: 1,
          type: 'create-inspection',
          url: '/a',
          method: 'post',
          payload: {},
          createdAt: '',
          tempId: TEMP_ID,
        },
        {
          id: 2,
          type: 'create-inspection-defect',
          url: '/b',
          method: 'post',
          payload: {},
          createdAt: '',
          dependsOn: TEMP_ID,
        },
        { id: 3, type: 'create-fuel-log', url: '/c', method: 'post', payload: {}, createdAt: '' },
        {
          id: 4,
          type: 'create-inspection-defect',
          url: '/d',
          method: 'post',
          payload: {},
          createdAt: '',
          dependsOn: 'tmp_gone',
        },
      ])

      expect(groups).toHaveLength(3)
      expect(groups[0].action.id).toBe(1)
      expect(groups[0].dependents.map((d) => d.id)).toEqual([2])
      expect(groups[1].action.id).toBe(3)
      expect(groups[2].action.id).toBe(4)
      expect(groups[2].dependents).toHaveLength(0)
    })
  })

  describe('pièces jointes — photos hors-ligne (#969)', () => {
    function attachment(name: string, content: string) {
      return {
        field: 'files',
        name,
        type: 'image/jpeg',
        data: new TextEncoder().encode(content).buffer as ArrayBuffer,
      }
    }

    test('le rejeu part en multipart, les fichiers reconstruits sous leur champ', async () => {
      makeRouterCallOnSuccess()
      const { enqueue, drainQueue, pendingCount } = mountComposable()

      await enqueue({
        type: 'upload-photos',
        url: '/boats/1/photos',
        method: 'post',
        payload: {},
        attachments: [attachment('a.jpg', 'aaa'), attachment('b.jpg', 'bb')],
      })
      expect(pendingCount.value).toBe(1)
      await drainQueue()

      const [url, data, options] = vi.mocked(router.post).mock.calls[0] as [
        string,
        { files: File[] },
        { forceFormData?: boolean },
      ]
      expect(url).toBe('/boats/1/photos')
      expect(options.forceFormData).toBe(true)
      expect(data.files.map((file) => file.name)).toEqual(['a.jpg', 'b.jpg'])
      expect(data.files[0].type).toBe('image/jpeg')
      expect(await data.files[0].text()).toBe('aaa')
      // Rejeu réussi : l'action et ses octets quittent la file.
      await vi.waitFor(() => expect(pendingCount.value).toBe(0))
    })

    test('une action sans pièce jointe ne force pas le multipart', async () => {
      makeRouterCallOnSuccess()
      const { enqueue, drainQueue } = mountComposable()

      await enqueue({
        type: 'create-fuel-log',
        url: '/boats/1/fuel-logs',
        method: 'post',
        payload: { liters: 10 },
      })
      await drainQueue()

      const [, data, options] = vi.mocked(router.post).mock.calls[0] as [
        string,
        unknown,
        { forceFormData?: boolean },
      ]
      expect(data).toEqual({ liters: 10 })
      expect(options.forceFormData).toBeUndefined()
    })

    test('un refus garde les photos dans les échecs, et la reprise les renvoie', async () => {
      makeRouterCallOnSuccessWithRejection('upload-photos', 'Aucune photo enregistrée')
      const { enqueue, drainQueue, failedActions, pendingCount, retryFailedAction } =
        mountComposable()

      await enqueue({
        type: 'upload-photos',
        url: '/boats/1/photos',
        method: 'post',
        payload: {},
        attachments: [attachment('a.jpg', 'aaa')],
      })
      await drainQueue()

      await vi.waitFor(() => expect(failedActions.value).toHaveLength(1))
      expect(failedActions.value[0].attachments?.[0].name).toBe('a.jpg')

      mockPageProps.flash = {}
      makeRouterCallOnSuccess()
      await retryFailedAction(failedActions.value[0].id!)

      await vi.waitFor(() => expect(vi.mocked(router.post)).toHaveBeenCalledTimes(2))
      const [, data] = vi.mocked(router.post).mock.calls[1] as [string, { files: File[] }]
      expect(await data.files[0].text()).toBe('aaa')
      // Le drain relancé par la reprise doit finir ici, pas dans le test suivant.
      await vi.waitFor(() => expect(pendingCount.value).toBe(0))
    })

    test('les photos d’un incident saisi hors-ligne suivent son id réel', async () => {
      const tempId = newTempId()
      makeRouterCallOnSuccessWithCreatedId('create-incident', '42')
      const { enqueue, drainQueue, pendingCount } = mountComposable()

      await enqueue({
        type: 'create-incident',
        url: '/boats/1/incidents',
        method: 'post',
        payload: { title: 'Voie d’eau' },
        tempId,
      })
      await enqueue({
        type: 'upload-photos',
        url: `/boats/1/incidents/${tempId}/photos`,
        method: 'post',
        payload: {},
        attachments: [attachment('voie.jpg', 'water')],
        dependsOn: tempId,
      })
      await drainQueue()

      await vi.waitFor(() => expect(pendingCount.value).toBe(0))
      const calls = vi.mocked(router.post).mock.calls
      expect(calls.map((call) => call[0])).toEqual([
        '/boats/1/incidents',
        '/boats/1/incidents/42/photos',
      ])
      const photoData = calls[1][1] as { files: File[] }
      expect(await photoData.files[0].text()).toBe('water')
    })
  })
})

describe('useOfflineQueue — actions silencieuses (#989)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.useRealTimers()
    cancelScheduledRetry()
    mockPageProps.flash = {}
    mockPageProps.user = { id: 1 }
    conflicts.value = []
    global.indexedDB = new IDBFactory()
    await mountComposable().drainQueue()
    global.indexedDB = new IDBFactory()
    vi.clearAllMocks()
  })

  const telemetry = {
    type: 'ingest-telemetry' as const,
    url: '/boats/1/telemetry',
    method: 'post' as const,
    payload: { sourceId: 1, batchId: 'b', samples: [] },
    silent: true,
  }

  test('enqueue silencieux : pas de toast, mais compté dans la file', async () => {
    const { enqueue, pendingCount, pendingActions } = mountComposable()

    await enqueue(telemetry)

    expect(toast.info).not.toHaveBeenCalled()
    expect(pendingCount.value).toBe(1)
    expect(pendingActions.value[0].silent).toBe(true)
  })

  test('le rejeu d’une action silencieuse ne toaste ni synchro ni bilan', async () => {
    const { enqueue, drainQueue, pendingCount } = mountComposable()
    await enqueue(telemetry)
    makeRouterCallOnSuccess()

    await drainQueue()
    await vi.waitFor(() => expect(pendingCount.value).toBe(0), { timeout: 1000 })

    expect(router.post).toHaveBeenCalledWith(
      '/boats/1/telemetry',
      telemetry.payload,
      expect.anything()
    )
    expect(pendingCount.value).toBe(0)
    expect(toast.info).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  test('un refus métier range le lot dans failed et le signale', async () => {
    const { enqueue, drainQueue, failedCount, pendingCount } = mountComposable()
    await enqueue(telemetry)
    makeRouterCallOnSuccessWithRejection('ingest-telemetry', 'La source est désactivée')

    await drainQueue()
    await vi.waitFor(() => expect(failedCount.value).toBe(1), { timeout: 1000 })

    expect(pendingCount.value).toBe(0)
    expect(failedCount.value).toBe(1)
    expect(toast.error).toHaveBeenCalled()
  })

  test('une action ordinaire garde ses toasts', async () => {
    const { enqueue } = mountComposable()
    await enqueue({ ...telemetry, silent: undefined })
    expect(toast.info).toHaveBeenCalledOnce()
  })
})
