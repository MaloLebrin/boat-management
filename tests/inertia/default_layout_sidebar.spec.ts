import { enableAutoUnmount, mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import DefaultLayout from '../../inertia/layouts/default.vue'

enableAutoUnmount(afterEach)
const mockDrainQueue = vi.hoisted(() => vi.fn())
const mockPromptInstall = vi.hoisted(() => vi.fn())
const mockUsePwaUpdate = vi.hoisted(() => vi.fn())
const mockUsePwaInstall = vi.hoisted(() => vi.fn())
const mockCancelScheduledRetry = vi.hoisted(() => vi.fn())
const mockDrainPendingQuestions = vi.hoisted(() => vi.fn())
// État de connectivité (#953) piloté par le test : `reachableCount` simule une
// probe `/up` réussie, `pendingCount` la file hors-ligne.
const net = vi.hoisted(() => ({
  state: { value: 'online' } as { value: 'online' | 'degraded' | 'offline' },
  reachableCount: { value: 0 },
  pendingCount: { value: 0 },
  isSyncing: { value: false },
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a><slot /></a>' },
  Form: { template: '<form><slot /></form>' },
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    url: '/dashboard',
    props: {
      user: { initials: 'ML', fullName: 'Marie L.' },
      flash: {},
      permissions: {
        role: 'member',
        capabilities: ['boats.view', 'ports.view', 'crew.create', 'maintenance.view'],
      },
      appT: {
        'nav.dashboard': 'Dashboard',
        'nav.boats': 'Boats',
        'nav.planning': 'Planning',
        'nav.history': 'History',
        'nav.settings': 'Settings',
        'nav.logout': 'Logout',
        'nav.sections.fleet': 'FLEET',
        'nav.sections.activity': 'ACTIVITY',
        'nav.sections.maintenance': 'MAINTENANCE',
        'nav.sections.business': 'MANAGEMENT',
        'ports.nav': 'Ports',
        'common.offline.banner': 'You are offline',
        'common.offline.degradedBanner': 'Unstable network',
        'common.pwa.install': 'Install app',
      },
    },
  }),
}))

vi.mock('~/composables/use_connectivity', async () => {
  const { ref: vueRef } = await vi.importActual<typeof import('vue')>('vue')
  const state = vueRef(net.state.value)
  const reachableCount = vueRef(0)
  net.state = state
  net.reachableCount = reachableCount
  return { useConnectivity: () => ({ state, reachableCount, probeConnectivity: vi.fn() }) }
})

vi.mock('~/composables/use_offline_queue', async () => {
  const { ref: vueRef } = await vi.importActual<typeof import('vue')>('vue')
  const pendingCount = vueRef(0)
  net.pendingCount = pendingCount
  const isSyncing = vueRef(false)
  net.isSyncing = isSyncing
  return {
    cancelScheduledRetry: mockCancelScheduledRetry,
    useOfflineQueue: () => ({
      drainQueue: mockDrainQueue,
      pendingCount,
      pendingActions: ref([]),
      failedCount: ref(0),
      failedActions: ref([]),
      isSyncing,
      suspendedReason: ref(null),
      retryAttempt: ref(0),
      enqueue: vi.fn(),
      cancelAction: vi.fn(),
      retryFailedAction: vi.fn(),
      discardFailedAction: vi.fn(),
      conflicts: vueRef([]),
      resolveConflict: vi.fn(),
      resolveAllConflicts: vi.fn(),
    }),
  }
})

vi.mock('~/composables/use_assistant_offline', () => ({
  useAssistantOffline: () => ({ drainPendingQuestions: mockDrainPendingQuestions }),
}))

vi.mock('~/composables/use_pwa_update', () => ({
  usePwaUpdate: mockUsePwaUpdate,
}))

vi.mock('~/composables/use_pwa_install', () => ({
  usePwaInstall: mockUsePwaInstall,
}))

// Default install mock — canInstall false unless overridden per test
beforeEach(() => {
  mockUsePwaInstall.mockReturnValue({ canInstall: ref(false), promptInstall: mockPromptInstall })
})

describe('DefaultLayout — sidebar', () => {
  test('shows sidebar links for authenticated user', () => {
    const w = mount(DefaultLayout, { slots: { default: '<div>Content</div>' } })
    expect(w.text()).toContain('Dashboard')
    expect(w.text()).toContain('Boats')
    expect(w.text()).toContain('Planning')
    expect(w.text()).toContain('Logout')
  })
})

describe('DefaultLayout — connectivité (#953)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    net.state.value = 'online'
    net.reachableCount.value = 0
    net.pendingCount.value = 0
    net.isSyncing.value = false
  })

  test('aucun bandeau en ligne', () => {
    const w = mount(DefaultLayout, { slots: { default: '<div>Content</div>' } })
    expect(w.text()).not.toContain('You are offline')
    expect(w.text()).not.toContain('Unstable network')
  })

  test('bandeau hors-ligne', () => {
    net.state.value = 'offline'
    const w = mount(DefaultLayout, { slots: { default: '<div>Content</div>' } })
    expect(w.text()).toContain('You are offline')
  })

  test('bandeau réseau dégradé', () => {
    net.state.value = 'degraded'
    const w = mount(DefaultLayout, { slots: { default: '<div>Content</div>' } })
    expect(w.text()).toContain('Unstable network')
    expect(w.text()).not.toContain('You are offline')
  })

  test('le drain part après une probe réussie quand la file est non vide', async () => {
    net.pendingCount.value = 2
    mount(DefaultLayout, { slots: { default: '<div>Content</div>' } })
    expect(mockDrainQueue).not.toHaveBeenCalled()

    net.reachableCount.value += 1
    await nextTick()

    expect(mockDrainQueue).toHaveBeenCalledOnce()
  })

  test('pas de drain sur probe réussie si la file est vide', async () => {
    mount(DefaultLayout, { slots: { default: '<div>Content</div>' } })
    net.reachableCount.value += 1
    await nextTick()

    expect(mockDrainQueue).not.toHaveBeenCalled()
    // File vide : les questions posées au copilote hors-ligne partent (#971).
    expect(mockDrainPendingQuestions).toHaveBeenCalledOnce()
  })

  test('les questions au copilote attendent la fin de la file de saisies (#971)', async () => {
    net.pendingCount.value = 2
    mount(DefaultLayout, { slots: { default: '<div>Content</div>' } })
    net.reachableCount.value += 1
    net.isSyncing.value = true
    await nextTick()
    expect(mockDrainQueue).toHaveBeenCalledOnce()
    expect(mockDrainPendingQuestions).not.toHaveBeenCalled()

    net.isSyncing.value = false
    await nextTick()
    expect(mockDrainPendingQuestions).toHaveBeenCalledOnce()
  })

  test('le passage en dégradé annule la relance différée, sans drain', async () => {
    net.pendingCount.value = 2
    mount(DefaultLayout, { slots: { default: '<div>Content</div>' } })
    net.state.value = 'degraded'
    await nextTick()

    expect(mockCancelScheduledRetry).toHaveBeenCalled()
    expect(mockDrainQueue).not.toHaveBeenCalled()
  })
})

describe('DefaultLayout — PWA update', () => {
  test('usePwaUpdate is called on mount', () => {
    mount(DefaultLayout, { slots: { default: '<div>Content</div>' } })
    expect(mockUsePwaUpdate).toHaveBeenCalled()
  })
})

describe('DefaultLayout — PWA install button', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePwaInstall.mockReturnValue({ canInstall: ref(false), promptInstall: mockPromptInstall })
  })

  test('install button is hidden when canInstall is false', () => {
    const w = mount(DefaultLayout, { slots: { default: '<div>Content</div>' } })
    expect(w.text()).not.toContain('Install app')
  })

  test('install button is shown when canInstall is true', () => {
    mockUsePwaInstall.mockReturnValue({ canInstall: ref(true), promptInstall: mockPromptInstall })
    const w = mount(DefaultLayout, { slots: { default: '<div>Content</div>' } })
    expect(w.text()).toContain('Install app')
  })

  test('clicking install button calls promptInstall', async () => {
    mockUsePwaInstall.mockReturnValue({ canInstall: ref(true), promptInstall: mockPromptInstall })
    const w = mount(DefaultLayout, { slots: { default: '<div>Content</div>' } })
    const btn = w.findAll('button').find((b) => b.text().includes('Install app'))
    expect(btn).toBeDefined()
    await btn!.trigger('click')
    expect(mockPromptInstall).toHaveBeenCalledOnce()
  })
})
