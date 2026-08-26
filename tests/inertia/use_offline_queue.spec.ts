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

const mockPageProps = vi.hoisted(() => ({
  appT: {
    'common.offline.savedQueue': 'Enregistré hors-ligne',
    'common.offline.syncing': 'Synchronisation en cours…',
    'common.offline.syncSuccess':
      '{count, plural, one {# entrée synchronisée} other {# entrées synchronisées}}',
    'common.offline.syncRejected': 'Refusée par le serveur — conservée dans les échecs',
    'common.offline.conflict.kept': 'Vos modifications seront renvoyées',
    'common.offline.conflict.discarded': 'Modifications locales abandonnées',
    'common.offline.queue.cancelled': 'Action annulée',
    'common.offline.failed.requeued': 'Action remise en file',
    'common.offline.failed.discarded': 'Action en échec abandonnée',
  },
  locale: 'fr',
  flash: {} as Record<string, unknown>,
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
import { conflictedAction, useOfflineQueue } from '../../inertia/composables/use_offline_queue'

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
  beforeEach(() => {
    vi.clearAllMocks()
    mockPageProps.flash = {}
    conflictedAction.value = null
    global.indexedDB = new IDBFactory()
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
    expect(toast.success).toHaveBeenCalledOnce()
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

  test('drainQueue sets conflictedAction and pauses queue on conflict response', async () => {
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
    // isSyncing is reset so the modal can resolve
    expect(conflictedAction.value).not.toBeNull()
    expect(conflictedAction.value?.action.type).toBe('update-navigation-log')
    expect(conflictedAction.value?.serverData).toEqual(serverData)
    // No error toast
    expect(toast.error).not.toHaveBeenCalled()
  })

  test('resolveConflict("server") discards action and decrements pendingCount', async () => {
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
    expect(conflictedAction.value).not.toBeNull()

    await resolveConflict('server')
    await flushPromises()

    expect(pendingCount.value).toBe(0)
    expect(conflictedAction.value).toBeNull()
    expect(toast.info).toHaveBeenCalledWith('Modifications locales abandonnées')
  })

  test('resolveConflict("local") re-enqueues with server updatedAt as new _expectedUpdatedAt', async () => {
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
    expect(conflictedAction.value).not.toBeNull()

    // Switch to normal success for the re-drain after resolving
    makeRouterCallOnSuccess()
    mockPageProps.flash = {}

    await resolveConflict('local')
    await flushPromises()

    // pendingCount should be 0 after re-drain succeeded
    await vi.waitFor(() => expect(pendingCount.value).toBe(0), { timeout: 1000 })
    expect(conflictedAction.value).toBeNull()
    expect(toast.info).toHaveBeenCalledWith('Vos modifications seront renvoyées')

    // Re-submitted with server's updatedAt as the new expected value
    expect(vi.mocked(router.patch)).toHaveBeenCalledWith(
      '/boats/1/navigation-logs/5',
      expect.objectContaining({ _expectedUpdatedAt: '2026-06-25T12:00:00.000Z' }),
      expect.any(Object)
    )
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
})
