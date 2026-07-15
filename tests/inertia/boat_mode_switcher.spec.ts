import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import BoatModeSwitcher from '../../inertia/components/boats/show/BoatModeSwitcher.vue'

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    name: 'MockInertiaLink',
    props: { href: { type: String, required: false } },
    template: '<a data-link :href="href"><slot /></a>',
  },
}))

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

test('renders both mode links using Inertia Link (no raw anchors)', () => {
  const w = mount(BoatModeSwitcher, { props: { boatId: 13, mode: 'management' } })
  const links = w.findAll('a[data-link]')
  expect(links).toHaveLength(2)
  expect(links[0].attributes('href')).toBe('/boats/13')
  expect(links[1].attributes('href')).toBe('/boats/13/navigation')
})

test('highlights the management link when mode is management', () => {
  const w = mount(BoatModeSwitcher, { props: { boatId: 5, mode: 'management' } })
  const [management, navigation] = w.findAll('a[data-link]')
  expect(management.classes().join(' ')).toContain('bg-brand')
  expect(navigation.classes().join(' ')).not.toContain('bg-brand')
})

test('highlights the navigation link when mode is navigation', () => {
  const w = mount(BoatModeSwitcher, { props: { boatId: 5, mode: 'navigation' } })
  const [management, navigation] = w.findAll('a[data-link]')
  expect(navigation.classes().join(' ')).toContain('bg-brand')
  expect(management.classes().join(' ')).not.toContain('bg-brand')
})
