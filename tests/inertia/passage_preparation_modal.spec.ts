import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// #967 — écran « Préparer la traversée » : pages pré-chargées et check-list.

const queue = vi.hoisted(() => ({ pendingCount: { value: 0 }, failedCount: { value: 0 } }))
const storage = vi.hoisted(() => ({ persisted: { value: null as boolean | null } }))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    version: 'v1',
    props: {
      appT: { 'boats.show.passage.pages.diagnostic': 'Diagnostic de panne — {engine}' },
      locale: 'fr',
    },
  }),
}))
vi.mock('~/composables/use_offline_queue', async () => {
  const { ref: vueRef } = await import('vue')
  const pendingCount = vueRef(0)
  const failedCount = vueRef(0)
  queue.pendingCount = pendingCount
  queue.failedCount = failedCount
  return { useOfflineQueue: () => ({ pendingCount, failedCount }) }
})
vi.mock('~/composables/use_persistent_storage', async () => {
  const { ref: vueRef } = await import('vue')
  const persisted = vueRef<boolean | null>(null)
  const estimate = vueRef({ usage: 0, quota: 1024 ** 3 })
  storage.persisted = persisted
  const requestPersistentStorage = vi.fn(async () => {
    persisted.value = true
    return true
  })
  const refreshStorageEstimate = vi.fn(async () => estimate.value)
  return {
    requestPersistentStorage,
    refreshStorageEstimate,
    usePersistentStorage: () => ({
      persisted,
      estimate,
      requestPersistentStorage,
      refreshStorageEstimate,
    }),
  }
})

import PassagePreparationModal from '../../inertia/components/boats/show/PassagePreparationModal.vue'

const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')

function setController(controller: Partial<ServiceWorker> | null) {
  Object.defineProperty(navigator, 'serviceWorker', { value: { controller }, configurable: true })
}

/** BaseModal re-rend son contenu une fois monté (#835) : attendre avant d'interagir. */
async function mountModal(engines: unknown[] = []) {
  const wrapper = mount(PassagePreparationModal, {
    props: { boatId: 3, open: true, engines: engines as never },
    global: { stubs: { teleport: true } },
  })
  await flushPromises()
  return wrapper
}

const status = (wrapper: Awaited<ReturnType<typeof mountModal>>, testId: string) =>
  wrapper.get(`[data-testid="${testId}"]`).attributes('data-status')

beforeEach(() => {
  queue.pendingCount.value = 0
  queue.failedCount.value = 0
  storage.persisted.value = null
  vi.stubGlobal('caches', {
    open: vi.fn().mockResolvedValue({ match: vi.fn().mockResolvedValue(undefined) }),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  if (originalServiceWorker)
    Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker)
  else Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true })
})

describe('PassagePreparationModal', () => {
  test('sans service worker : avertissement et bouton désactivé', async () => {
    setController(null)
    const wrapper = await mountModal()
    await flushPromises()

    expect(wrapper.text()).toContain('boats.show.passage.noServiceWorker')
    expect(wrapper.get('[data-testid="passage-prepare"]').attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('[data-testid^="passage-page-"]')).toHaveLength(6)
    expect(wrapper.text()).toContain('boats.show.passage.notCached')
  })

  test('check-list initiale : pages absentes, stockage non demandé, file vide', async () => {
    setController(null)
    const wrapper = await mountModal()
    await flushPromises()

    expect(status(wrapper, 'passage-check-pages')).toBe('warning')
    expect(status(wrapper, 'passage-check-storage')).toBe('unknown')
    expect(status(wrapper, 'passage-check-quota')).toBe('ok')
    expect(status(wrapper, 'passage-check-queue')).toBe('ok')
    expect(status(wrapper, 'passage-check-session')).toBe('unknown')
  })

  test('saisies en attente et retour au-delà de la session → à vérifier', async () => {
    setController(null)
    const wrapper = await mountModal()
    queue.pendingCount.value = 2
    const farReturn = new Date()
    farReturn.setDate(farReturn.getDate() + 45)
    await wrapper
      .get('input[name="passage-return-date"]')
      .setValue(farReturn.toISOString().slice(0, 10))
    await flushPromises()

    expect(status(wrapper, 'passage-check-queue')).toBe('warning')
    expect(status(wrapper, 'passage-check-session')).toBe('warning')
    expect(wrapper.text()).toContain('boats.show.passage.checklist.sessionDetail.warning')
  })

  test('pré-chargement : pages prêtes, datées, stockage demandé', async () => {
    const postMessage = vi.fn((message: { url: string }, ports: MessagePort[]) =>
      ports[0]!.postMessage({ url: message.url, ok: true })
    )
    setController({ postMessage } as unknown as ServiceWorker)
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ component: 'boats/show' }), {
            headers: { 'X-Inertia': 'true' },
          })
      )
    )
    const cachedResponse = new Response('', { headers: { Date: 'Mon, 12 Oct 2026 10:00:00 GMT' } })
    vi.stubGlobal('caches', {
      open: vi.fn().mockResolvedValue({ match: vi.fn().mockResolvedValue(cachedResponse) }),
    })

    const wrapper = await mountModal()
    await wrapper.get('[data-testid="passage-prepare"]').trigger('click')
    await vi.waitFor(() => expect(status(wrapper, 'passage-page-planning')).toBe('done'))
    await flushPromises()

    expect(postMessage).toHaveBeenCalledTimes(6)
    expect(status(wrapper, 'passage-check-pages')).toBe('ok')
    expect(status(wrapper, 'passage-check-storage')).toBe('ok')
    expect(wrapper.text()).toContain('boats.show.passage.cachedAt')
  })

  test('une ligne de diagnostic par moteur éligible, au nom du moteur (#981)', async () => {
    setController(null)
    const wrapper = await mountModal([
      {
        id: 21,
        kind: 'outboard',
        fuel: 'essence',
        strokeType: '2_stroke',
        family: null,
        brand: 'Yamaha',
        model: '25 BMHS',
        serialNumber: null,
      },
      {
        id: 22,
        kind: 'electric',
        fuel: null,
        strokeType: null,
        family: null,
        brand: 'Torqeedo',
        model: null,
        serialNumber: null,
      },
    ])

    expect(wrapper.findAll('[data-testid^="passage-page-"]')).toHaveLength(8)
    expect(wrapper.find('[data-testid="passage-page-diagnosticIndex"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="passage-page-diagnostic-21"]').text()).toContain(
      'Diagnostic de panne — Yamaha 25 BMHS'
    )
    expect(wrapper.find('[data-testid="passage-page-diagnostic-22"]').exists()).toBe(false)
  })
})
