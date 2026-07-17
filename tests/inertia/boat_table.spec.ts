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
    type: null,
    propulsionType: 'sailboat',
    updatedAt: null,
    maintenance: { urgentCount: 0, upcomingCount: 0, nextDueAt: null },
    ...overrides,
  }
}

test('hides Registration and Type columns when no boat has that data', () => {
  const w = mount(BoatTable, { props: { boats: [makeBoat(), makeBoat({ id: 2 })] } })
  expect(w.text()).not.toContain('boats.list.table.registration')
  expect(w.text()).not.toContain('boats.list.table.type')
  expect(w.findAll('th').length).toBe(3)
})

test('shows Registration column when at least one boat has a registration number', () => {
  const w = mount(BoatTable, {
    props: { boats: [makeBoat(), makeBoat({ id: 2, registrationNumber: 'FR-1234' })] },
  })
  expect(w.text()).toContain('boats.list.table.registration')
  expect(w.text()).toContain('FR-1234')
  expect(w.text()).not.toContain('boats.list.table.type')
})

test('shows Type column when at least one boat has a type', () => {
  const w = mount(BoatTable, {
    props: { boats: [makeBoat(), makeBoat({ id: 2, type: 'Monohull' })] },
  })
  expect(w.text()).toContain('boats.list.table.type')
  expect(w.text()).toContain('Monohull')
})
