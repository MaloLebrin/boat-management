import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { beforeEach, expect, test, vi } from 'vitest'

const mockFormPost = vi.hoisted(() => vi.fn())
const mockFormTransform = vi.hoisted(() => vi.fn())

// Le vrai `useForm` rend son état réactif : le pré-remplissage du carburant
// repose sur un `watch` du moteur sélectionné (#585).
vi.mock('@inertiajs/vue3', () => ({
  useForm: (initial: Record<string, unknown>) => {
    const form: Record<string, unknown> = reactive({
      ...initial,
      errors: {},
      processing: false,
      post: mockFormPost,
      data: () => ({ ...initial }),
      transform: (fn: (data: Record<string, unknown>) => unknown) => {
        mockFormTransform(fn)
        return form
      },
    })
    return form
  },
  usePage: () => ({
    props: {
      appT: {
        'boats.options.engineFuel.diesel': 'Diesel',
        'boats.options.engineFuel.essence': 'Essence',
      },
      locale: 'fr',
    },
  }),
}))

vi.mock('~/composables/use_network_status', () => ({
  useNetworkStatus: () => ({ isOnline: { value: true } }),
}))

vi.mock('~/composables/use_offline_queue', () => ({
  useOfflineQueue: () => ({ enqueue: vi.fn() }),
}))

import BoatFuelLogForm from '../../inertia/components/boats/show/tabs/BoatFuelLogForm.vue'

// Cas réel de la bi-motorisation : in-bord diesel + hors-bord essence.
const boat = {
  id: 42,
  name: 'Bora Bora',
  engines: [
    { id: 7, kind: 'inboard', fuel: 'diesel', brand: 'Volvo Penta', model: 'D2-40' },
    { id: 8, kind: 'outboard', fuel: 'essence', brand: 'Yamaha', model: 'F6' },
  ],
} as never

function fuelSelect(wrapper: ReturnType<typeof mount>) {
  return wrapper.get('select[name="fuelType"]')
}

beforeEach(() => {
  vi.clearAllMocks()
})

test('the fuel select offers the engine fuel vocabulary and starts unspecified', () => {
  const wrapper = mount(BoatFuelLogForm, { props: { boat } })

  expect(
    fuelSelect(wrapper)
      .findAll('option')
      .map((o) => o.attributes('value'))
  ).toEqual(['', 'diesel', 'essence', 'electric', 'other'])
  expect((fuelSelect(wrapper).element as unknown as HTMLSelectElement).value).toBe('')
})

test('selecting an engine prefills the fuel it runs on (#585)', async () => {
  const wrapper = mount(BoatFuelLogForm, { props: { boat } })

  await wrapper.get('select[name="boatEngineId"]').setValue('8')

  expect((fuelSelect(wrapper).element as unknown as HTMLSelectElement).value).toBe('essence')
})

test('switching engines refreshes a fuel that is still the suggested one', async () => {
  const wrapper = mount(BoatFuelLogForm, { props: { boat } })

  await wrapper.get('select[name="boatEngineId"]').setValue('8')
  await wrapper.get('select[name="boatEngineId"]').setValue('7')

  expect((fuelSelect(wrapper).element as unknown as HTMLSelectElement).value).toBe('diesel')
})

test('a hand-picked fuel is never overwritten by the engine (#585)', async () => {
  const wrapper = mount(BoatFuelLogForm, { props: { boat } })

  // Plein d'essence pour l'annexe alors que le moteur in-bord reste choisi.
  await fuelSelect(wrapper).setValue('essence')
  await wrapper.get('select[name="boatEngineId"]').setValue('7')

  expect((fuelSelect(wrapper).element as unknown as HTMLSelectElement).value).toBe('essence')
})
