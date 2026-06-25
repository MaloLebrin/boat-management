import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import NavigationLogUpdateForm from '../../inertia/components/boats/show/tabs/NavigationLogUpdateForm.vue'

const mockIsOnline = vi.hoisted(() => ({ value: true }))
const mockEnqueue = vi.hoisted(() => vi.fn())
const mockFormPatch = vi.hoisted(() => vi.fn())
const mockFormData = vi.hoisted(() =>
  vi.fn(() => ({ windForceBeaufort: 3, seaState: 'slight', crewCount: 2, notes: 'ok' }))
)

vi.mock('@inertiajs/vue3', () => ({
  useForm: () => ({
    windForceBeaufort: 3,
    seaState: 'slight',
    crewCount: 2,
    notes: 'ok',
    errors: {},
    processing: false,
    patch: mockFormPatch,
    data: mockFormData,
  }),
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
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

const log = {
  id: 5,
  boatId: 7,
  status: 'in_progress',
  departedAt: '2026-06-24T10:00:00.000Z',
  arrivedAt: null,
  departurePortId: null,
  departurePortName: null,
  arrivalPortId: null,
  arrivalPortName: null,
  distanceNm: null,
  engineHoursStart: null,
  engineHoursEnd: null,
  fuelConsumedLiters: null,
  windForceBeaufort: 3,
  seaState: 'slight',
  crewCount: 2,
  notes: 'ok',
  createdAt: '2026-06-24T10:00:00.000Z',
  updatedAt: '2026-06-24T10:05:00.000Z',
  crew: [],
} as any

describe('NavigationLogUpdateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsOnline.value = true
  })

  test('online: submit calls form.patch with the correct URL', async () => {
    const wrapper = mount(NavigationLogUpdateForm, { props: { boatId: 7, log } })
    await wrapper.find('form').trigger('submit')
    expect(mockFormPatch).toHaveBeenCalledWith(
      '/boats/7/navigation-logs/5',
      expect.objectContaining({ preserveScroll: true })
    )
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  test('offline: submit calls enqueue with correct payload including _expectedUpdatedAt', async () => {
    mockIsOnline.value = false
    const wrapper = mount(NavigationLogUpdateForm, { props: { boatId: 7, log } })
    await wrapper.find('form').trigger('submit')
    expect(mockEnqueue).toHaveBeenCalledWith({
      type: 'update-navigation-log',
      url: '/boats/7/navigation-logs/5',
      method: 'patch',
      payload: expect.objectContaining({
        _expectedUpdatedAt: '2026-06-24T10:05:00.000Z',
      }),
    })
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(mockFormPatch).not.toHaveBeenCalled()
  })

  test('cancel button emits close', async () => {
    const wrapper = mount(NavigationLogUpdateForm, { props: { boatId: 7, log } })
    await wrapper.find('button[type="button"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
