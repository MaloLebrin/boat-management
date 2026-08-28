import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

/**
 * #492 — bottom tab bar mobile : 4 raccourcis par rôle, gardés par les mêmes
 * capabilities que la nav complète (aucune logique de droits dupliquée), via
 * `<Link>` Inertia — le drawer reste la navigation exhaustive.
 */

const mockRole = vi.hoisted(() => ({ value: 'mechanic' as string | null }))
const mockCaps = vi.hoisted(() => ({ value: new Set<string>() }))
const mockUrl = vi.hoisted(() => ({ value: '/dashboard' }))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    get url() {
      return mockUrl.value
    },
    props: { appT: {}, locale: 'en' },
  }),
}))

vi.mock('~/composables/use_permissions', () => ({
  usePermissions: () => ({
    role: mockRole,
    isAdmin: { value: mockRole.value === 'admin' },
    isMember: { value: mockRole.value === 'member' },
    isMechanic: { value: mockRole.value === 'mechanic' },
    isBoatOwner: { value: mockRole.value === 'boat_owner' },
    can: (cap: string) => mockCaps.value.has(cap),
  }),
}))

vi.mock('~/composables/use_plan', () => ({
  usePlan: () => ({ effectiveQuotas: { value: {} } }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    template: '<a data-inertia-link :href="href"><slot /></a>',
    props: ['href', 'route'],
  },
}))

vi.mock('~/components/layout/NavIcon.vue', () => ({
  default: { template: '<svg />', props: ['name'] },
}))

import MobileBottomNav from '../../inertia/components/layout/MobileBottomNav.vue'

const ALL_CAPS = ['boats.view', 'maintenance.view', 'incidents.view']

describe('MobileBottomNav (#492)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRole.value = 'mechanic'
    mockCaps.value = new Set(ALL_CAPS)
    mockUrl.value = '/dashboard'
  })

  test('mechanic: 4 entries — dashboard, planning, history, boats', () => {
    const wrapper = mount(MobileBottomNav)

    const links = wrapper.findAll('a')
    expect(links).toHaveLength(4)
    expect(links.map((l) => l.attributes('href'))).toEqual([
      '/dashboard',
      '/planning',
      '/maintenance/history',
      '/boats',
    ])
  })

  test('admin: 4 entries — dashboard, boats, planning, reservations', () => {
    mockRole.value = 'admin'
    const wrapper = mount(MobileBottomNav)

    expect(wrapper.findAll('a').map((l) => l.attributes('href'))).toEqual([
      '/dashboard',
      '/boats',
      '/planning',
      '/reservations',
    ])
  })

  test('boat_owner: the bar is hidden entirely', () => {
    mockRole.value = 'boat_owner'
    const wrapper = mount(MobileBottomNav)

    expect(wrapper.find('nav').exists()).toBe(false)
  })

  test('entries are capability-gated, never hardcoded', () => {
    mockCaps.value = new Set(['boats.view'])
    const wrapper = mount(MobileBottomNav)

    expect(wrapper.findAll('a').map((l) => l.attributes('href'))).toEqual(['/dashboard', '/boats'])
  })

  test('the active entry reflects the current route', () => {
    mockUrl.value = '/planning?week=2026-W35'
    const wrapper = mount(MobileBottomNav)

    const active = wrapper.findAll('a').filter((l) => l.attributes('aria-current') === 'page')
    expect(active).toHaveLength(1)
    expect(active[0].attributes('href')).toBe('/planning')
    expect(active[0].classes()).toContain('text-brand')
  })

  test('a nested URL still activates its parent entry', () => {
    mockUrl.value = '/boats/42'
    const wrapper = mount(MobileBottomNav)

    const active = wrapper.findAll('a').filter((l) => l.attributes('aria-current') === 'page')
    expect(active).toHaveLength(1)
    expect(active[0].attributes('href')).toBe('/boats')
  })

  test('every entry is an Inertia Link, not a bare anchor', () => {
    const wrapper = mount(MobileBottomNav)

    for (const link of wrapper.findAll('a')) {
      expect(link.attributes('data-inertia-link')).toBeDefined()
    }
  })

  test('the bar is hidden on desktop and clears the iOS safe area', () => {
    const wrapper = mount(MobileBottomNav)

    const nav = wrapper.find('nav')
    expect(nav.classes()).toContain('lg:hidden')
    expect(nav.attributes('class')).toContain('pb-[env(safe-area-inset-bottom)]')
  })

  test('bottomNav aria label is translated in both locales', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    for (const locale of ['en', 'fr'] as const) {
      const json = JSON.parse(
        readFileSync(resolve(__dirname, `../../resources/lang/${locale}/nav.json`), 'utf8')
      ) as Record<string, string>
      expect(json.bottomNav, `nav.bottomNav (${locale})`).toBeTruthy()
    }
  })
})
