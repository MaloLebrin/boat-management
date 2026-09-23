import { expect, test, vi } from 'vitest'
import Incidents from '../../inertia/pages/navigation/incidents.vue'
import { mountWithStubs, routerSpies } from './helpers/mount'

vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

const PAGE_STUBS = {
  IncidentRow: { template: '<tr />' },
  IncidentCard: { template: '<div />' },
  NavigationBoatFilter: { template: '<div />' },
  QuickAddIncidentModal: { template: '<div />' },
}

const baseProps = { incidents: [], boats: [], canCreateIncidents: true }

test('empty state routes to the selected boat navigation page when a boat is filtered', async () => {
  const w = mountWithStubs(Incidents, {
    stubs: PAGE_STUBS,
    props: { ...baseProps, selectedBoatId: 42 },
  })
  const action = w.get('[data-empty-action]')
  expect(action.attributes('data-label')).toBe('navigation.incidents.empty.actionBoat')
  await action.trigger('click')
  expect(routerSpies.visit).toHaveBeenCalledWith('/boats/42/navigation')
})

test('empty state routes to the boats list when no boat is filtered', async () => {
  const w = mountWithStubs(Incidents, {
    stubs: PAGE_STUBS,
    props: { ...baseProps, selectedBoatId: null },
  })
  const action = w.get('[data-empty-action]')
  expect(action.attributes('data-label')).toBe('navigation.incidents.empty.action')
  await action.trigger('click')
  expect(routerSpies.visit).toHaveBeenCalledWith('/boats')
})

test('empty state routes straight to the only boat of the fleet (#823)', async () => {
  const w = mountWithStubs(Incidents, {
    stubs: PAGE_STUBS,
    props: { ...baseProps, boats: [{ id: 7, name: 'Mistral' }], selectedBoatId: null },
  })
  const action = w.get('[data-empty-action]')
  expect(action.attributes('data-label')).toBe('navigation.incidents.empty.actionBoat')
  await action.trigger('click')
  expect(routerSpies.visit).toHaveBeenCalledWith('/boats/7/navigation')
})

test('empty state still routes to the boats list with several boats', async () => {
  const w = mountWithStubs(Incidents, {
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
