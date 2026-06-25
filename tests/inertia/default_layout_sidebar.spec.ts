import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import DefaultLayout from '../../inertia/layouts/default.vue'

const mockDrainQueue = vi.hoisted(() => vi.fn())
const mockPromptInstall = vi.hoisted(() => vi.fn())
const mockUsePwaUpdate = vi.hoisted(() => vi.fn())
const mockUsePwaInstall = vi.hoisted(() => vi.fn())

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
      appT: {
        'nav.dashboard': 'Dashboard',
        'nav.myBoats': 'My boats',
        'nav.planning': 'Planning',
        'nav.history': 'History',
        'nav.settings': 'Settings',
        'nav.logout': 'Logout',
        'nav.sections.fleet': 'FLEET',
        'nav.sections.maintenance': 'MAINTENANCE',
        'nav.sections.preferences': 'PREFERENCES',
        'ports.nav': 'Ports',
        'offline.banner': 'You are offline',
        'pwa.install': 'Install app',
      },
    },
  }),
}))

vi.mock('~/composables/use_network_status', () => ({
  useNetworkStatus: vi.fn(() => ({ isOnline: ref(true) })),
}))

vi.mock('~/composables/use_offline_queue', () => ({
  useOfflineQueue: () => ({
    drainQueue: mockDrainQueue,
    pendingCount: ref(0),
    isSyncing: ref(false),
    enqueue: vi.fn(),
  }),
}))

vi.mock('~/composables/use_pwa_update', () => ({
  usePwaUpdate: mockUsePwaUpdate,
}))

vi.mock('~/composables/use_pwa_install', () => ({
  usePwaInstall: mockUsePwaInstall,
}))

// Import after vi.mock so we get the mocked version
import { useNetworkStatus } from '../../inertia/composables/use_network_status'

// Default install mock — canInstall false unless overridden per test
beforeEach(() => {
  mockUsePwaInstall.mockReturnValue({ canInstall: ref(false), promptInstall: mockPromptInstall })
})

describe('DefaultLayout — sidebar', () => {
  test('shows sidebar links for authenticated user', () => {
    const w = mount(DefaultLayout, { slots: { default: '<div>Content</div>' } })
    expect(w.text()).toContain('Dashboard')
    expect(w.text()).toContain('My boats')
    expect(w.text()).toContain('Planning')
    expect(w.text()).toContain('Logout')
  })
})

describe('DefaultLayout — offline mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('offline banner is hidden when online', () => {
    vi.mocked(useNetworkStatus).mockReturnValue({ isOnline: ref(true) })
    const w = mount(DefaultLayout, { slots: { default: '<div>Content</div>' } })
    expect(w.text()).not.toContain('You are offline')
  })

  test('offline banner is shown when offline', () => {
    vi.mocked(useNetworkStatus).mockReturnValue({ isOnline: ref(false) })
    const w = mount(DefaultLayout, { slots: { default: '<div>Content</div>' } })
    expect(w.text()).toContain('You are offline')
  })

  test('drainQueue is called when coming back online', async () => {
    const isOnline = ref(false)
    vi.mocked(useNetworkStatus).mockReturnValue({ isOnline })
    mount(DefaultLayout, { slots: { default: '<div>Content</div>' } })

    isOnline.value = true
    await nextTick()

    expect(mockDrainQueue).toHaveBeenCalledOnce()
  })

  test('drainQueue is not called on initial mount when already online', () => {
    vi.mocked(useNetworkStatus).mockReturnValue({ isOnline: ref(true) })
    mount(DefaultLayout, { slots: { default: '<div>Content</div>' } })
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
