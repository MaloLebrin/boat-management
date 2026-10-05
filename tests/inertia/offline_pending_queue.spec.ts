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

const mockPageProps = vi.hoisted(() => ({
  // Shared prop `user` : session valide. Mise à `undefined` pour simuler la
  // redirection /login suivie par Inertia (#950).
  user: { id: 1 } as { id: number } | undefined,
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    props: {
      get user() {
        return mockPageProps.user
      },
      appT: {
        'common.offline.sessionExpired': 'Session expirée',
        'common.offline.queue.suspendedAuth':
          'Synchronisation en pause : reconnectez-vous pour envoyer ces saisies.',
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
        'common.offline.failed.dependencyBlocked':
          "L'état des lieux auquel cette saisie est rattachée n'a pas pu être enregistré.",
        'common.offline.queue.dependsOn': "Rattaché à l'état des lieux en attente",
        'common.offline.queue.type.create-inspection': 'Nouvel état des lieux',
        'common.offline.queue.type.create-inspection-defect': "Défaut d'inspection",
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
  beforeEach(async () => {
    vi.clearAllMocks()
    mockPageProps.user = { id: 1 }
    conflictedAction.value = null
    global.indexedDB = new IDBFactory()
    // L'état de suspension (#950) est module-level : un drain à vide sur une
    // session valide le remet à zéro entre deux tests.
    await useOfflineQueue().drainQueue()
    vi.clearAllMocks()
  })

  test('renders nothing when no pending actions', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('ul').exists()).toBe(false)
  })

  // #950 — la session a expiré pendant le rejeu : la file reste intacte et
  // l'utilisateur voit pourquoi rien ne part.
  test('shows the paused notice when the drain is suspended for auth', async () => {
    const { router } = await import('@inertiajs/vue3')
    const { enqueue, drainQueue } = useOfflineQueue()
    await enqueue({
      type: 'create-fuel-log',
      url: '/boats/1/fuel-logs',
      method: 'post',
      payload: { quantityLiters: '50' },
    })

    mockPageProps.user = undefined
    await drainQueue()

    const wrapper = mountComponent()
    await flushPromises()

    expect(router.post).not.toHaveBeenCalled()
    expect(wrapper.findAll('li')).toHaveLength(1)
    expect(wrapper.find('[data-test="queue-suspended"]').text()).toContain(
      'Synchronisation en pause'
    )
  })

  test('does not show the paused notice while the session is valid', async () => {
    const { enqueue } = useOfflineQueue()
    await enqueue({
      type: 'create-fuel-log',
      url: '/boats/1/fuel-logs',
      method: 'post',
      payload: { quantityLiters: '50' },
    })

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('[data-test="queue-suspended"]').exists()).toBe(false)
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

  // #622 — une création et les saisies qui la référencent sont affichées comme
  // un seul bloc : reprendre ou abandonner est une décision unique.
  describe('groupes de dépendance (#622)', () => {
    const TEMP_ID = 'tmp_inspection1'

    async function seedInspectionGroup() {
      const { enqueue } = useOfflineQueue()
      await enqueue({
        type: 'create-inspection',
        url: '/boats/1/reservations/2/inspections',
        method: 'post',
        payload: { kind: 'checkout', performedAt: '2026-09-02T10:00' },
        tempId: TEMP_ID,
      })
      await enqueue({
        type: 'create-inspection-defect',
        url: `/boats/1/reservations/2/inspections/${TEMP_ID}/equipment-actions`,
        method: 'post',
        payload: { label: 'Taquet arraché', actionType: 'to_repair' },
        dependsOn: TEMP_ID,
      })
    }

    test('the queued defect is nested under its inspection, not listed on its own', async () => {
      await seedInspectionGroup()

      const wrapper = mountComponent()
      await flushPromises()

      // Une seule entrée racine, la fille imbriquée dedans.
      const rootItems = wrapper.findAll('[data-test="queue-group"]')
      expect(rootItems).toHaveLength(1)
      expect(rootItems[0].text()).toContain('Nouvel état des lieux')
      expect(rootItems[0].find('[data-test="queue-dependent"]').text()).toContain(
        "Défaut d'inspection"
      )
      expect(wrapper.text()).toContain("Rattaché à l'état des lieux en attente")
      // La fille n'a pas de bouton propre : le groupe s'annule d'un bloc.
      expect(rootItems[0].findAll('button')).toHaveLength(1)
    })

    test('cancelling the pending inspection removes the whole group', async () => {
      await seedInspectionGroup()

      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.find('li button').trigger('click')

      await vi.waitFor(() => expect(wrapper.find('ul').exists()).toBe(false), { timeout: 1000 })
    })

    test('a cascaded failure shows the dependent under its parent with its reason', async () => {
      const { router } = await import('@inertiajs/vue3')
      vi.mocked(router.post).mockImplementationOnce((_url, _data, options: any) => {
        options?.onError?.({ performedAt: 'La date du relevé est invalide' })
        return undefined as any
      })
      await seedInspectionGroup()
      const { drainQueue, failedCount } = useOfflineQueue()
      await drainQueue()
      await vi.waitFor(() => expect(failedCount.value).toBe(2), { timeout: 1000 })

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('2 actions en échec')
      expect(wrapper.text()).toContain('Motif : La date du relevé est invalide')
      expect(wrapper.text()).toContain("Motif : L'état des lieux auquel cette saisie est rattachée")
      // Reprise et abandon ne s'offrent que sur la parente.
      const failedRoots = wrapper.findAll('[data-test="failed-group"]')
      expect(failedRoots).toHaveLength(1)
      expect(failedRoots[0].findAll('button')).toHaveLength(2)
      expect(failedRoots[0].findAll('[data-test="failed-dependent"]')).toHaveLength(1)
    })

    test('discarding the failed inspection discards its dependent too', async () => {
      const { router } = await import('@inertiajs/vue3')
      vi.mocked(router.post).mockImplementationOnce((_url, _data, options: any) => {
        options?.onError?.({ performedAt: 'La date du relevé est invalide' })
        return undefined as any
      })
      await seedInspectionGroup()
      const { drainQueue, failedCount } = useOfflineQueue()
      await drainQueue()
      await vi.waitFor(() => expect(failedCount.value).toBe(2), { timeout: 1000 })

      const wrapper = mountComponent()
      await flushPromises()
      const buttons = wrapper.findAll('li button')
      await buttons[buttons.length - 1].trigger('click')

      await vi.waitFor(() => expect(failedCount.value).toBe(0), { timeout: 1000 })
    })
  })
})
