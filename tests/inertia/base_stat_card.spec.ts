import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import BaseStatCard from '../../inertia/components/base/BaseStatCard.vue'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    props: {
      appT: {
        'common.tone.neutral': 'neutral',
        'common.tone.success': 'success',
        'common.tone.info': 'info',
        'common.tone.warning': 'warning',
        'common.tone.empty': 'empty',
      },
      locale: 'en',
    },
  }),
}))

test('renders label and value', () => {
  const w = mount(BaseStatCard, { props: { label: 'Boats', value: '12', tone: 'info' } })
  expect(w.text()).toContain('Boats')
  expect(w.text()).toContain('12')
})

test('renders the tone as badge text', () => {
  const w = mount(BaseStatCard, { props: { label: 'Tasks', value: '5', tone: 'success' } })
  expect(w.text()).toContain('success')
})

test('renders delta text when provided', () => {
  const w = mount(BaseStatCard, { props: { label: 'Revenue', value: '1 000 €', delta: '+12 %' } })
  expect(w.text()).toContain('+12 %')
})

test('does not render delta element when delta is omitted', () => {
  const w = mount(BaseStatCard, { props: { label: 'Revenue', value: '1 000 €' } })
  expect(w.text()).not.toContain('+')
  expect(w.find('p.text-sm.text-fg-subtle').exists()).toBe(false)
})

test('defaults tone to neutral when not specified', () => {
  const w = mount(BaseStatCard, { props: { label: 'Users', value: '3' } })
  expect(w.text()).toContain('neutral')
})

test('renders warning tone badge', () => {
  const w = mount(BaseStatCard, { props: { label: 'Alerts', value: '2', tone: 'warning' } })
  expect(w.text()).toContain('warning')
})

test('renders empty tone badge when there is no data', () => {
  const w = mount(BaseStatCard, { props: { label: 'Engines', value: '0', tone: 'empty' } })
  expect(w.text()).toContain('empty')
})

test('never truncates the label so it stays readable in narrow cards', () => {
  const w = mount(BaseStatCard, { props: { label: 'Urgent maintenance', value: '2' } })
  expect(w.find('p.truncate').exists()).toBe(false)
})
