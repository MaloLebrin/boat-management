import { flushPromises, mount } from '@vue/test-utils'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('vue-sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    props: {
      appT: {
        'common.offline.queue.title':
          '{count, plural, one {# action en attente} other {# actions en attente}}',
        'common.offline.queue.syncNow': 'Synchroniser',
        'common.offline.queue.cancel': 'Annuler',
        'common.offline.queue.cancelled': 'Action annulée',
        'common.offline.queue.cancelAriaLabel': "Annuler l'action : {type}",
        'common.offline.queue.type.create-navigation-log': 'Nouvelle sortie',
        'common.offline.queue.type.create-fuel-log': 'Avitaillement',
        'common.offline.syncing': 'Synchronisation en cours…',
        'common.offline.syncRejected': 'Refusée par le serveur — conservée dans les échecs',
        'common.offline.failed.title':
          '{count, plural, one {# action en échec} other {# actions en échec}}',
        'common.offline.failed.description': 'Ces saisies ont été refusées par le serveur.',
        'common.offline.failed.reason': 'Motif :',
        'common.offline.failed.noReason': 'Refusée par le serveur (erreur de validation)',
        'common.offline.failed.retry': 'Réessayer',
        'common.offline.failed.retryAriaLabel': "Réessayer l'action en échec : {type}",
        'common.offline.failed.requeued': 'Action remise en file',
        'common.offline.failed.discard': 'Abandonner',
        'common.offline.failed.discardAriaLabel': "Abandonner l'action en échec : {type}",
        'common.offline.failed.discarded': 'Action en échec abandonnée',
      },
      locale: 'fr',
      flash: {},
    },
  }),
  router: {
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
  },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template:
      '<button :type="type" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled', 'ariaLabel'],
    emits: ['click'],
  },
}))

import { conflictedAction, useOfflineQueue } from '../../inertia/composables/use_offline_queue'
import OfflinePendingQueue from '../../inertia/components/OfflinePendingQueue.vue'

function mountComponent() {
  return mount(OfflinePendingQueue, {
    global: { stubs: { Teleport: true } },
  })
}

describe('OfflinePendingQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    conflictedAction.value = null
    global.indexedDB = new IDBFactory()
  })

  test('renders nothing when no pending actions', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('ul').exists()).toBe(false)
  })

  test('renders list with one item after enqueueing', async () => {
    const { enqueue } = useOfflineQueue()
    await enqueue({
      type: 'create-navigation-log',
      url: '/boats/1/navigation-logs',
      method: 'post',
      payload: { departedAt: '2026-06-24T10:00' },
    })

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('ul').exists()).toBe(true)
    expect(wrapper.findAll('li')).toHaveLength(1)
    expect(wrapper.text()).toContain('Nouvelle sortie')
    expect(wrapper.text()).toContain('1 action en attente')
  })

  test('renders all queued items', async () => {
    const { enqueue } = useOfflineQueue()
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

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.findAll('li')).toHaveLength(2)
    expect(wrapper.text()).toContain('Nouvelle sortie')
    expect(wrapper.text()).toContain('Avitaillement')
    expect(wrapper.text()).toContain('2 actions en attente')
  })

  test('cancel button removes item from list', async () => {
    const { enqueue } = useOfflineQueue()
    await enqueue({
      type: 'create-navigation-log',
      url: '/boats/1/navigation-logs',
      method: 'post',
      payload: { departedAt: '2026-06-24T10:00' },
    })

    const wrapper = mountComponent()
    await flushPromises()
    expect(wrapper.findAll('li')).toHaveLength(1)

    const cancelBtn = wrapper.find('li button')
    await cancelBtn.trigger('click')

    await vi.waitFor(() => expect(wrapper.findAll('li')).toHaveLength(0), { timeout: 1000 })
    expect(wrapper.find('ul').exists()).toBe(false)
  })

  test('cancel button only removes the targeted item when multiple are queued', async () => {
    const { enqueue } = useOfflineQueue()
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

    const wrapper = mountComponent()
    await flushPromises()
    expect(wrapper.findAll('li')).toHaveLength(2)

    const firstCancelBtn = wrapper.findAll('li button')[0]
    await firstCancelBtn.trigger('click')

    await vi.waitFor(() => expect(wrapper.findAll('li')).toHaveLength(1), { timeout: 1000 })
    expect(wrapper.text()).toContain('Avitaillement')
    expect(wrapper.text()).not.toContain('Nouvelle sortie')
  })

  describe('actions en échec (#487)', () => {
    async function seedFailedAction() {
      const { router } = await import('@inertiajs/vue3')
      vi.mocked(router.post).mockImplementationOnce((_url, _data, options: any) => {
        options?.onError?.({ departedAt: 'La date de départ est invalide' })
        return undefined as any
      })
      const { enqueue, drainQueue, failedCount } = useOfflineQueue()
      await enqueue({
        type: 'create-navigation-log',
        url: '/boats/1/navigation-logs',
        method: 'post',
        payload: { departedAt: 'invalid' },
      })
      await drainQueue()
      await vi.waitFor(() => expect(failedCount.value).toBe(1), { timeout: 1000 })
    }

    test('renders the failed section with the rejection reason and both actions', async () => {
      await seedFailedAction()

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('1 action en échec')
      expect(wrapper.text()).toContain('Motif : La date de départ est invalide')
      expect(wrapper.text()).toContain('Réessayer')
      expect(wrapper.text()).toContain('Abandonner')
    })

    test('discard button removes the failed action', async () => {
      await seedFailedAction()

      const wrapper = mountComponent()
      await flushPromises()
      const discardBtn = wrapper.findAll('button').find((b) => b.text().includes('Abandonner'))!

      await discardBtn.trigger('click')

      await vi.waitFor(() => expect(wrapper.text()).not.toContain('action en échec'), {
        timeout: 1000,
      })
    })

    test('failed actions do not appear in the pending list', async () => {
      await seedFailedAction()

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.text()).not.toContain('action en attente')
    })
  })

  describe('dark mode (#416)', () => {
    test('les lignes en attente basculent avec la surface', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.html()).toContain('bg-surface-elevated')
      expect(wrapper.html()).not.toContain('bg-white')
    })
  })
})
