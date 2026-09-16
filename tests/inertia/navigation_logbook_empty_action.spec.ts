import { expect, test, vi } from 'vitest'
import Logbook from '../../inertia/pages/navigation/logbook.vue'
import { mountWithStubs, routerSpies } from './helpers/mount'

vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

const PAGE_STUBS = {
  LogbookRow: { template: '<tr />' },
  NavigationBoatFilter: { template: '<div />' },
}

const baseProps = { logs: [], boats: [] }

test('empty state routes to the selected boat navigation page when a boat is filtered', async () => {
  const w = mountWithStubs(Logbook, {
    stubs: PAGE_STUBS,
    props: { ...baseProps, selectedBoatId: 42 },
  })
  const action = w.get('[data-empty-action]')
  expect(action.attributes('data-label')).toBe('navigation.logbook.empty.actionBoat')
  await action.trigger('click')
  expect(routerSpies.visit).toHaveBeenCalledWith('/boats/42/navigation')
})

test('empty state routes to the boats list when no boat is filtered', async () => {
  const w = mountWithStubs(Logbook, {
    stubs: PAGE_STUBS,
    props: { ...baseProps, selectedBoatId: null },
  })
  const action = w.get('[data-empty-action]')
  expect(action.attributes('data-label')).toBe('navigation.logbook.empty.action')
  await action.trigger('click')
  expect(routerSpies.visit).toHaveBeenCalledWith('/boats')
})

test('empty state routes straight to the only boat of the fleet (#603)', async () => {
  const w = mountWithStubs(Logbook, {
    stubs: PAGE_STUBS,
    props: { ...baseProps, boats: [{ id: 7, name: 'Mistral' }], selectedBoatId: null },
  })
  const action = w.get('[data-empty-action]')
  expect(action.attributes('data-label')).toBe('navigation.logbook.empty.actionBoat')
  await action.trigger('click')
  expect(routerSpies.visit).toHaveBeenCalledWith('/boats/7/navigation')
})

test('empty state still routes to the boats list with several boats', async () => {
  const w = mountWithStubs(Logbook, {
    stubs: PAGE_STUBS,
    props: {
      ...baseProps,
      boats: [
        { id: 7, name: 'Mistral' },
        { id: 8, name: 'Zephyr' },
      ],
      selectedBoatId: null,
    },
  })
  await w.get('[data-empty-action]').trigger('click')
  expect(routerSpies.visit).toHaveBeenCalledWith('/boats')
})
