import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}${JSON.stringify(vars)}` : key,
  }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatTime: (v: Date) => `t:${v.toISOString()}` }),
}))

vi.mock('~/components/boats/show/tabs/instruments/InstrumentAisMap.vue', () => ({
  __esModule: true,
  default: { props: ['targets', 'own'], template: '<div data-testid="ais-map-stub" />' },
}))

import InstrumentAisPanel from '../../inertia/components/boats/show/tabs/instruments/InstrumentAisPanel.vue'
import type { AisTarget } from '../../shared/types/ais'

function make(overrides: Partial<AisTarget>): AisTarget {
  return {
    mmsi: '244630000',
    seenAt: '2026-10-25T10:00:00.000Z',
    name: 'ALBATROS',
    latitude: 43,
    longitude: 5,
    sogMs: 5.14444,
    cogRad: Math.PI / 2,
    shipType: 36,
    shipTypeName: 'Sailing',
    cpaM: null,
    tcpaS: null,
    distanceM: 1852,
    ...overrides,
  }
}

const OWN = { latitude: 43, longitude: 5 }

describe('InstrumentAisPanel (#1009)', () => {
  test('liste triée par distance, unités marines', () => {
    const wrapper = mount(InstrumentAisPanel, {
      props: {
        live: true,
        own: OWN,
        targets: [
          make({ mmsi: '200000002', name: 'LOIN', distanceM: 9260 }),
          make({ mmsi: '200000001', name: 'PRES', distanceM: 926 }),
        ],
      },
    })
    const rows = wrapper.findAll('[data-testid="ais-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('PRES')
    expect(rows[0].text()).toContain('0.50')
    expect(rows[1].text()).toContain('5.00')
    expect(rows[0].text()).toContain('10.0')
    expect(rows[0].text()).toContain('90°')
    expect(wrapper.text()).toContain('instruments.ais.live')
  })

  test('sans nom : le MMSI sert de libellé', () => {
    const wrapper = mount(InstrumentAisPanel, {
      props: { live: false, own: null, targets: [make({ name: null, distanceM: null })] },
    })
    const row = wrapper.get('[data-testid="ais-row"]')
    expect(row.text()).toContain('244630000')
    expect(row.text()).toContain('—')
    expect(wrapper.text()).toContain('instruments.ais.lastKnown')
  })

  test('CPA/TCPA : badge de risque, éloignement et valeur absente', () => {
    const wrapper = mount(InstrumentAisPanel, {
      props: {
        live: true,
        own: OWN,
        targets: [
          make({ mmsi: '200000001', distanceM: 100, cpaM: 300, tcpaS: 300 }),
          make({ mmsi: '200000002', distanceM: 200, cpaM: 300, tcpaS: -60 }),
          make({ mmsi: '200000003', distanceM: 300, cpaM: 5000, tcpaS: 7200 }),
        ],
      },
    })
    const rows = wrapper.findAll('[data-testid="ais-row"]')
    expect(rows[0].text()).toContain('instruments.ais.risk.danger')
    expect(rows[0].text()).toContain('"minutes":"5"')
    expect(rows[1].text()).toContain('instruments.ais.diverging')
    expect(rows[1].text()).not.toContain('instruments.ais.risk')
    expect(rows[2].text()).not.toContain('instruments.ais.risk')
  })

  test('aucune cible : message vide, pas de tableau', () => {
    const wrapper = mount(InstrumentAisPanel, { props: { live: true, own: OWN, targets: [] } })
    expect(wrapper.find('[data-testid="ais-empty"]').exists()).toBe(true)
    expect(wrapper.find('table').exists()).toBe(false)
  })

  test('bascule vers la carte', async () => {
    const wrapper = mount(InstrumentAisPanel, {
      props: { live: true, own: OWN, targets: [make({})] },
    })
    await wrapper.get('[data-testid="ais-view-map"]').trigger('click')
    await vi.dynamicImportSettled()
    await flushPromises()
    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.find('[data-testid="ais-map-stub"]').exists()).toBe(true)
    await wrapper.get('[data-testid="ais-view-list"]').trigger('click')
    expect(wrapper.find('table').exists()).toBe(true)
  })
})
