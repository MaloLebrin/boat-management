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
        'offline.queue.title': '{count} action(s) en attente',
        'offline.queue.syncNow': 'Synchroniser',
        'offline.queue.cancel': 'Annuler',
        'offline.queue.cancelled': 'Action annulée',
        'offline.queue.cancelAriaLabel': "Annuler l'action : {type}",
        'offline.queue.type.create-navigation-log': 'Nouvelle sortie',
        'offline.queue.type.create-fuel-log': 'Avitaillement',
        'offline.syncing': 'Synchronisation en cours…',
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
    expect(wrapper.text()).toContain('1 action(s) en attente')
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
    expect(wrapper.text()).toContain('2 action(s) en attente')
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
})
