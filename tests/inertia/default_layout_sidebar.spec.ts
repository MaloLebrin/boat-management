import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import DefaultLayout from '../../inertia/layouts/default.vue'

vi.mock('@adonisjs/inertia/vue', () => {
  return {
    Link: { template: '<a><slot /></a>' },
    Form: { template: '<form><slot /></form>' },
  }
})

vi.mock('@inertiajs/vue3', () => {
  return {
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
        },
      },
    }),
  }
})

test('shows sidebar links for authenticated user', () => {
  const w = mount(DefaultLayout, {
    slots: { default: '<div>Content</div>' },
  })

  expect(w.text()).toContain('Dashboard')
  expect(w.text()).toContain('My boats')
  expect(w.text()).toContain('Planning')
  expect(w.text()).toContain('Logout')
})
