import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import BoatTable from '../../inertia/components/boats/list/BoatTable.vue'
import type { BoatListItem } from '../../inertia/components/boats/list/types'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('~/components/base/BaseBadge.vue', () => ({
  default: { template: '<span><slot /></span>' },
}))

function makeBoat(overrides: Partial<BoatListItem> = {}): BoatListItem {
  return {
    id: 1,
    name: 'Hanse 388',
    registrationNumber: null,
    category: null,
    propulsionType: 'sailboat',
    status: 'available',
    updatedAt: null,
    maintenance: { urgentCount: 0, upcomingCount: 0, nextDueAt: null },
    ...overrides,
  }
}

test('hides Registration and Category columns when no boat has that data', () => {
  const w = mount(BoatTable, { props: { boats: [makeBoat(), makeBoat({ id: 2 })] } })
  expect(w.text()).not.toContain('boats.list.table.registration')
  expect(w.text()).not.toContain('boats.list.table.category')
  expect(w.findAll('th').length).toBe(4)
})

test('shows Registration column when at least one boat has a registration number', () => {
  const w = mount(BoatTable, {
    props: { boats: [makeBoat(), makeBoat({ id: 2, registrationNumber: 'FR-1234' })] },
  })
  expect(w.text()).toContain('boats.list.table.registration')
  expect(w.text()).toContain('FR-1234')
  expect(w.text()).not.toContain('boats.list.table.category')
})

test('shows Category column when at least one boat has a category', () => {
  const w = mount(BoatTable, {
    props: { boats: [makeBoat(), makeBoat({ id: 2, category: 'sailboat_monohull' })] },
  })
  expect(w.text()).toContain('boats.list.table.category')
  // Le libellé passe par `boatCategoryLabel` : le mock de `t` renvoie la clé.
  expect(w.text()).toContain('boats.options.category.sailboat_monohull')
})

test('shows the availability status of each boat (#870)', () => {
  const w = mount(BoatTable, {
    props: { boats: [makeBoat(), makeBoat({ id: 2, status: 'out_of_service' })] },
  })
  expect(w.text()).toContain('boats.list.table.status')
  expect(w.text()).toContain('boats.availability.status.available')
  expect(w.text()).toContain('boats.availability.status.out_of_service')
})
