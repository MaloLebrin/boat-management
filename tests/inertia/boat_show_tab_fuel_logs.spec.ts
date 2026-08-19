import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import BoatShowTabFuelLogs from '../../inertia/components/boats/show/tabs/BoatShowTabFuelLogs.vue'

vi.mock('@inertiajs/vue3', () => ({
  router: { delete: vi.fn() },
  useForm: () => ({ errors: {}, processing: false, post: vi.fn(), data: vi.fn(() => ({})) }),
  usePage: () => ({
    props: {
      appT: {
        'boats.options.engineKind.inboard': 'In-bord',
        'fuel_logs.count': '{count} plein(s)',
      },
      locale: 'fr',
    },
  }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button :type="type"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled', 'route'],
  },
}))

vi.mock('~/components/boats/show/tabs/BoatFuelLogForm.vue', () => ({
  default: { template: '<form />' },
}))

const boat = {
  id: 42,
  name: 'Bora Bora',
  engines: [{ id: 7, kind: 'inboard', brand: 'Volvo Penta', model: 'D2-40' }],
} as any

const fuelLogs = [
  {
    id: 1,
    fueledAt: '2026-06-25',
    quantityLiters: 50,
    pricePerLiter: null,
    totalCost: null,
    boatEngineId: 7,
    engineHoursAtFueling: null,
    supplier: null,
    notes: null,
  },
] as any

describe('BoatShowTabFuelLogs', () => {
  test('translates the engine kind in the log caption instead of the raw token (#472)', () => {
    const wrapper = mount(BoatShowTabFuelLogs, {
      props: { boat, fuelLogs, canManage: true, canDelete: false },
    })

    expect(wrapper.text()).toContain('In-bord — Volvo Penta — D2-40')
    expect(wrapper.text()).not.toContain('inboard')
  })

  test('renders no engine caption when the log is not tied to an engine', () => {
    const orphanLog = [{ ...fuelLogs[0], boatEngineId: null }] as any
    const wrapper = mount(BoatShowTabFuelLogs, {
      props: { boat, fuelLogs: orphanLog, canManage: true, canDelete: false },
    })

    expect(wrapper.text()).not.toContain('In-bord')
  })
})
