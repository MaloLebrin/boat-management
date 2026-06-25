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

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    usePage: vi.fn(() => ({
      props: {
        appT: {
          'offline.savedQueue': 'Enregistré hors-ligne',
          'offline.syncing': 'Synchronisation en cours…',
          'offline.syncSuccess': '{count} entrée(s) synchronisée(s)',
          'offline.syncError': 'Erreur de synchronisation',
        },
        locale: 'fr',
      },
    })),
    router: {
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
    },
  }
})

import { router } from '@inertiajs/vue3'
import { toast } from 'vue-sonner'
import { useOfflineQueue } from '../../inertia/composables/use_offline_queue'

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

function makeRouterCallOnError() {
  vi.mocked(router.post).mockImplementation((_url, _data, options: any) => {
    options?.onError?.()
    return undefined as any
  })
  vi.mocked(router.patch).mockImplementation((_url, _data, options: any) => {
    options?.onError?.()
    return undefined as any
  })
  vi.mocked(router.put).mockImplementation((_url, _data, options: any) => {
    options?.onError?.()
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

describe('useOfflineQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Fresh IDB per test — no cross-test state
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

  test('drainQueue shows error toast and discards action on server error', async () => {
    makeRouterCallOnError()
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

    expect(toast.error).toHaveBeenCalledOnce()
    expect(toast.success).not.toHaveBeenCalled()
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
})
