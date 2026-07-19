import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import Forbidden from '../../inertia/pages/errors/forbidden.vue'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    name: 'MockInertiaLink',
    props: { href: { type: String, required: false } },
    template: '<a :href="href"><slot /></a>',
  },
}))

test('renders the forbidden title, description and dashboard link', () => {
  const w = mount(Forbidden)

  expect(w.text()).toContain('errors.forbidden.title')
  expect(w.text()).toContain('errors.forbidden.description')
  expect(w.text()).toContain('errors.forbidden.action')
})

test('links back to the dashboard via Inertia Link', () => {
  const w = mount(Forbidden)

  const link = w.find('a')
  expect(link.exists()).toBe(true)
  expect(link.attributes('href')).toBe('/dashboard')
})
