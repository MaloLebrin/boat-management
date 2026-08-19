import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import BoatFuelLogForm from '../../inertia/components/boats/show/tabs/BoatFuelLogForm.vue'

const mockIsOnline = vi.hoisted(() => ({ value: true }))
const mockEnqueue = vi.hoisted(() => vi.fn())
const mockFormPost = vi.hoisted(() => vi.fn())
const mockFormData = vi.hoisted(() =>
  vi.fn(() => ({ fueledAt: '2026-06-25', quantityLiters: '50', supplier: '', notes: '' }))
)

vi.mock('@inertiajs/vue3', () => ({
  useForm: () => ({
    fueledAt: '2026-06-25',
    quantityLiters: '',
    pricePerLiter: '',
    totalCost: '',
    boatEngineId: '',
    engineHoursAtFueling: '',
    supplier: '',
    notes: '',
    errors: {},
    processing: false,
    post: mockFormPost,
    data: mockFormData,
  }),
  usePage: () => ({
    props: {
      appT: {
        'boats.options.engineKind.inboard': 'In-bord',
        'boats.options.engineKind.outboard': 'Hors-bord',
      },
      locale: 'fr',
    },
  }),
}))

vi.mock('~/composables/use_network_status', () => ({
  useNetworkStatus: () => ({ isOnline: mockIsOnline }),
}))

vi.mock('~/composables/use_offline_queue', () => ({
  useOfflineQueue: () => ({ enqueue: mockEnqueue }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button :type="type" :disabled="disabled"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled', 'route'],
  },
}))

const boat = { id: 42, name: 'Bora Bora', engines: [] } as any

describe('BoatFuelLogForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsOnline.value = true
  })

  test('online: submit calls form.post with the correct URL', async () => {
    const wrapper = mount(BoatFuelLogForm, { props: { boat } })
    await wrapper.find('form').trigger('submit')
    expect(mockFormPost).toHaveBeenCalledWith(
      '/boats/42/fuel-logs',
      expect.objectContaining({ preserveScroll: true })
    )
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  test('offline: submit calls enqueue with correct payload and emits close', async () => {
    mockIsOnline.value = false
    const wrapper = mount(BoatFuelLogForm, { props: { boat } })
    await wrapper.find('form').trigger('submit')
    expect(mockEnqueue).toHaveBeenCalledWith({
      type: 'create-fuel-log',
      url: '/boats/42/fuel-logs',
      method: 'post',
      payload: expect.any(Object),
    })
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(mockFormPost).not.toHaveBeenCalled()
  })

  test('offline: does not submit to server after enqueue', async () => {
    mockIsOnline.value = false
    const wrapper = mount(BoatFuelLogForm, { props: { boat } })
    await wrapper.find('form').trigger('submit')
    expect(mockFormPost).not.toHaveBeenCalled()
  })

  test('cancel button emits close', async () => {
    const wrapper = mount(BoatFuelLogForm, { props: { boat } })
    await wrapper.find('button[type="button"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  test('engine options translate the engine kind instead of showing the raw token (#472)', () => {
    const boatWithEngines = {
      ...boat,
      engines: [
        { id: 7, kind: 'inboard', brand: 'Volvo Penta', model: 'D2-40' },
        { id: 8, kind: 'outboard', brand: null, model: null },
      ],
    } as any
    const wrapper = mount(BoatFuelLogForm, { props: { boat: boatWithEngines } })
    const labels = wrapper.findAll('option').map((o) => o.text())

    expect(labels).toContain('In-bord — Volvo Penta D2-40')
    expect(labels).toContain('Hors-bord')
    expect(labels.join(' ')).not.toContain('inboard')
  })
})
