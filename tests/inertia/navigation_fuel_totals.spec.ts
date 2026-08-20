import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import type { FleetFuelLogRow } from '../../shared/types/navigation'

const mockLocale = { value: 'fr' }

vi.mock('@inertiajs/vue3', () => ({
  Head: { template: '<div><slot /></div>' },
  usePage: () => ({ props: { appT: {}, locale: mockLocale.value } }),
  router: { visit: vi.fn() },
}))

vi.mock('~/components/base/BaseEmptyState.vue', () => ({
  default: { template: '<div />', props: ['title', 'description', 'actionLabel'] },
}))
vi.mock('~/components/base/BaseHeading.vue', () => ({
  default: { template: '<h1><slot /></h1>', props: ['level'] },
}))
vi.mock('~/components/navigation/FuelLogRow.vue', () => ({
  default: { template: '<tr />', props: ['row'] },
}))
vi.mock('~/components/navigation/NavigationBoatFilter.vue', () => ({
  default: { template: '<div />', props: ['boats', 'selectedBoatId', 'basePath'] },
}))

import FuelPage from '../../inertia/pages/navigation/fuel.vue'

function log(overrides: Partial<FleetFuelLogRow> = {}): FleetFuelLogRow {
  return {
    id: 1,
    boatId: 1,
    boatName: 'Alizé',
    fueledAt: '2026-07-01',
    quantityLiters: 120.5,
    totalCost: 300,
    supplier: null,
    notes: null,
    ...overrides,
  }
}

describe('fuel page totals', () => {
  test('total liters uses the locale decimal separator (fr → comma)', () => {
    mockLocale.value = 'fr'
    const wrapper = mount(FuelPage, {
      props: { logs: [log({ quantityLiters: 0 })], boats: [], selectedBoatId: null },
    })
    // FR: "0,0 L" — comma, never "0.0"
    expect(wrapper.text()).toContain('0,0 L')
    expect(wrapper.text()).not.toContain('0.0')
  })

  test('total liters uses a dot in en', () => {
    mockLocale.value = 'en'
    const wrapper = mount(FuelPage, {
      props: { logs: [log({ quantityLiters: 10 })], boats: [], selectedBoatId: null },
    })
    expect(wrapper.text()).toContain('10.0 L')
    mockLocale.value = 'fr'
  })

  test('total cost is rendered as euros', () => {
    mockLocale.value = 'fr'
    const wrapper = mount(FuelPage, {
      props: { logs: [log({ totalCost: 300 })], boats: [], selectedBoatId: null },
    })
    expect(wrapper.text()).toContain('€')
    expect(wrapper.text()).not.toContain('$')
  })
})
