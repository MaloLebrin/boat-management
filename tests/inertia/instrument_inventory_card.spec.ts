import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import { ref } from 'vue'
import InstrumentInventoryCard from '../../inertia/components/boats/show/tabs/instruments/InstrumentInventoryCard.vue'
import type { InstrumentDevice } from '../../shared/types/instruments'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}${JSON.stringify(vars)}` : key,
    locale: ref('fr'),
  }),
}))

const NOW = Date.parse('2026-11-01T12:00:00Z')

function device(over: Partial<InstrumentDevice> = {}): InstrumentDevice {
  return {
    id: 1,
    deviceId: 'dev-1',
    label: 'Volvo EVC',
    manufacturer: 'Volvo Penta',
    model: 'EVC',
    function: 'Engine',
    bus: 'n2k',
    address: 12,
    paths: ['propulsion.port.revolutions'],
    firstSeenAt: '2026-11-01T10:00:00Z',
    lastSeenAt: '2026-11-01T11:55:00Z',
    goneAt: null,
    ...over,
  }
}

describe('InstrumentInventoryCard', () => {
  test('regroupe les appareils par fonction, dans l’ordre des rubriques', () => {
    const w = mount(InstrumentInventoryCard, {
      props: {
        now: NOW,
        devices: [
          device({ id: 2, deviceId: 'tank', paths: ['tanks.fuel.0.currentLevel'], function: null }),
          device({ id: 1 }),
          device({
            id: 3,
            deviceId: 'odd',
            paths: [],
            function: 'Widget',
            manufacturer: null,
            model: null,
          }),
        ],
      },
    })

    const groups = w
      .findAll('[data-testid^="instrument-inventory-group-"]')
      .map((el) => el.attributes('data-testid'))
    expect(groups).toEqual([
      'instrument-inventory-group-engine',
      'instrument-inventory-group-tank',
      'instrument-inventory-group-other',
    ])
    expect(w.text()).toContain('Volvo Penta EVC')
  })

  test('affiche « vu il y a » depuis l’horloge fournie', () => {
    const w = mount(InstrumentInventoryCard, { props: { now: NOW, devices: [device()] } })
    expect(w.find('[data-testid="instrument-device-seen"]').text()).toContain(
      'instruments.inventory.seen.minutes{"count":"5"}'
    )
  })

  test('signale un appareil qui n’est plus annoncé', () => {
    const w = mount(InstrumentInventoryCard, {
      props: { now: NOW, devices: [device({ goneAt: '2026-11-01T11:00:00Z' })] },
    })
    expect(w.find('[data-testid="instrument-device-seen"]').text()).toContain(
      'instruments.inventory.gone'
    )
  })

  test('liste les chemins fournis dans un détail repliable', () => {
    const w = mount(InstrumentInventoryCard, {
      props: { now: NOW, devices: [device({ paths: ['a.b', 'c.d'] })] },
    })
    const details = w.find('details')
    expect(details.exists()).toBe(true)
    expect(details.attributes('open')).toBeUndefined()
    expect(details.text()).toContain('instruments.inventory.paths{"count":"2"}')
    expect(details.text()).toContain('a.b')
    expect(details.text()).toContain('c.d')
  })

  test('état vide : aucun appareil annoncé, avec les causes', () => {
    const w = mount(InstrumentInventoryCard, { props: { now: NOW, devices: [] } })
    const empty = w.find('[data-testid="instrument-inventory-empty"]')
    expect(empty.exists()).toBe(true)
    expect(empty.text()).toContain('instruments.inventory.empty.title')
    expect(empty.text()).toContain('instruments.inventory.empty.causes')
    expect(w.find('details').exists()).toBe(false)
  })
})
