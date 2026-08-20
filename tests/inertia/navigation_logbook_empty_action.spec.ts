import { mount } from '@vue/test-utils'
import { test, expect, vi, beforeEach } from 'vitest'
import Logbook from '../../inertia/pages/navigation/logbook.vue'

const visit = vi.fn()

vi.mock('@inertiajs/vue3', () => ({
  Head: { template: '<div><slot /></div>' },
  router: { visit: (...args: unknown[]) => visit(...args) },
}))

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

vi.mock('~/components/navigation/LogbookRow.vue', () => ({
  default: { template: '<tr />' },
}))

vi.mock('~/components/navigation/NavigationBoatFilter.vue', () => ({
  default: { template: '<div />' },
}))

vi.mock('~/components/base/BaseHeading.vue', () => ({
  default: { template: '<h1><slot /></h1>' },
}))

vi.mock('~/components/base/BaseEmptyState.vue', () => ({
  default: {
    props: ['title', 'description', 'actionLabel'],
    emits: ['action'],
    template: `<button data-empty-action :data-label="actionLabel" @click="$emit('action')">{{ actionLabel }}</button>`,
  },
}))

const baseProps = { logs: [], boats: [] }

beforeEach(() => visit.mockClear())

test('empty state routes to the selected boat navigation page when a boat is filtered', async () => {
  const w = mount(Logbook, { props: { ...baseProps, selectedBoatId: 42 } })
  const action = w.get('[data-empty-action]')
  expect(action.attributes('data-label')).toBe('navigation.logbook.empty.actionBoat')
  await action.trigger('click')
  expect(visit).toHaveBeenCalledWith('/boats/42/navigation')
})

test('empty state routes to the boats list when no boat is filtered', async () => {
  const w = mount(Logbook, { props: { ...baseProps, selectedBoatId: null } })
  const action = w.get('[data-empty-action]')
  expect(action.attributes('data-label')).toBe('navigation.logbook.empty.action')
  await action.trigger('click')
  expect(visit).toHaveBeenCalledWith('/boats')
})
