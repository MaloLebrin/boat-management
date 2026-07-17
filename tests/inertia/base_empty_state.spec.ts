import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import BaseEmptyState from '../../inertia/components/base/BaseEmptyState.vue'

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    name: 'MockInertiaLink',
    props: { route: { type: String, required: false } },
    template: '<a data-link><slot /></a>',
  },
}))

test('renders title', () => {
  const w = mount(BaseEmptyState, { props: { title: 'Nothing here' } })
  expect(w.text()).toContain('Nothing here')
})

test('renders description when provided', () => {
  const w = mount(BaseEmptyState, {
    props: { title: 'No boats', description: 'Add your first boat to get started.' },
  })
  expect(w.text()).toContain('Add your first boat to get started.')
})

test('does not render description element when omitted', () => {
  const w = mount(BaseEmptyState, { props: { title: 'Empty' } })
  const descEl = w.find('p.text-sm.text-fg-muted')
  expect(descEl.exists()).toBe(false)
})

test('renders action button when actionLabel is provided', () => {
  const w = mount(BaseEmptyState, {
    props: { title: 'No items', actionLabel: 'Create one' },
  })
  expect(w.text()).toContain('Create one')
})

test('does not render action button when actionLabel is omitted', () => {
  const w = mount(BaseEmptyState, { props: { title: 'Empty' } })
  const btn = w.find('button')
  expect(btn.exists()).toBe(false)
})

test('emits action event when action button is clicked', async () => {
  const w = mount(BaseEmptyState, {
    props: { title: 'No items', actionLabel: 'Add' },
  })
  await w.find('button').trigger('click')
  expect(w.emitted('action')).toBeTruthy()
})

test('renders custom action slot content instead of the default button', () => {
  const w = mount(BaseEmptyState, {
    props: { title: 'No items' },
    slots: { action: '<a data-custom-action>Custom action</a>' },
  })
  expect(w.find('[data-custom-action]').exists()).toBe(true)
  expect(w.text()).toContain('Custom action')
})

test('action slot content is shown even without actionLabel', () => {
  const w = mount(BaseEmptyState, {
    props: { title: 'No items' },
    slots: { action: '<button data-custom-action>Go</button>' },
  })
  expect(w.find('[data-custom-action]').exists()).toBe(true)
  expect(w.find('button:not([data-custom-action])').exists()).toBe(false)
})
