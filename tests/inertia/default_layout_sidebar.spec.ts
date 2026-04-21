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
      },
    }),
  }
})

test('shows sidebar links for authenticated user', () => {
  const w = mount(DefaultLayout, {
    slots: { default: '<div>Content</div>' },
  })

  expect(w.text()).toContain('Dashboard')
  expect(w.text()).toContain('Boats')
  expect(w.text()).toContain('Design system')
  expect(w.text()).toContain('Logout')
})
