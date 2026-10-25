import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

const leaflet = vi.hoisted(() => {
  const marker = { bindPopup: vi.fn(), addTo: vi.fn() }
  marker.bindPopup.mockReturnValue(marker)
  marker.addTo.mockReturnValue(marker)
  const map = {
    setView: vi.fn(),
    fitBounds: vi.fn(),
    remove: vi.fn(),
  }
  map.setView.mockReturnValue(map)
  const layerGroup = { clearLayers: vi.fn(), addTo: vi.fn() }
  layerGroup.addTo.mockReturnValue(layerGroup)
  const tileLayer = { addTo: vi.fn() }
  return {
    marker,
    map,
    layerGroup,
    divIcon: vi.fn((options: { html: string }) => options),
    api: {
      map: vi.fn(() => map),
      tileLayer: vi.fn(() => tileLayer),
      layerGroup: vi.fn(() => layerGroup),
      marker: vi.fn(() => marker),
      latLngBounds: vi.fn((points: unknown) => points),
    },
  }
})

vi.mock('leaflet', () => ({
  default: { ...leaflet.api, divIcon: leaflet.divIcon },
  ...leaflet.api,
  divIcon: leaflet.divIcon,
}))

import InstrumentAisMap from '../../inertia/components/boats/show/tabs/instruments/InstrumentAisMap.vue'
import type { AisTarget } from '../../shared/types/ais'

function make(overrides: Partial<AisTarget>): AisTarget {
  return {
    mmsi: '244630000',
    seenAt: '2026-10-25T10:00:00.000Z',
    name: 'ALBATROS',
    latitude: 43.01,
    longitude: 5,
    sogMs: 2,
    cogRad: 1,
    shipType: null,
    shipTypeName: null,
    cpaM: null,
    tcpaS: null,
    distanceM: 1000,
    ...overrides,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('InstrumentAisMap (#1009)', () => {
  test('un marqueur par cible plus celui du bateau, cadrage une seule fois', async () => {
    const wrapper = mount(InstrumentAisMap, {
      props: {
        own: { latitude: 43, longitude: 5 },
        targets: [make({}), make({ mmsi: '244630001', cogRad: null })],
      },
    })
    await flushPromises()

    expect(leaflet.api.marker).toHaveBeenCalledTimes(3)
    expect(leaflet.map.fitBounds).toHaveBeenCalledTimes(1)

    await wrapper.setProps({ targets: [make({ latitude: 43.02 })] })
    expect(leaflet.layerGroup.clearLayers).toHaveBeenCalledTimes(2)
    expect(leaflet.map.fitBounds).toHaveBeenCalledTimes(1)
  })

  test('la couleur suit le risque et la flèche le cap', async () => {
    mount(InstrumentAisMap, {
      props: {
        own: null,
        targets: [make({ cpaM: 200, tcpaS: 100 }), make({ mmsi: '244630001', cogRad: null })],
      },
    })
    await flushPromises()

    const htmls = leaflet.divIcon.mock.calls.map(([options]) => options.html)
    expect(htmls[0]).toContain('var(--color-danger)')
    expect(htmls[0]).toContain('rotate(57deg)')
    expect(htmls[1]).toContain('border-radius:50%')
  })

  test('sans cible ni position, aucun cadrage ; le démontage détruit la carte', async () => {
    const wrapper = mount(InstrumentAisMap, { props: { own: null, targets: [] } })
    await flushPromises()
    expect(leaflet.map.fitBounds).not.toHaveBeenCalled()
    wrapper.unmount()
    expect(leaflet.map.remove).toHaveBeenCalled()
  })
})
