import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import NavigationLogForm from '../../inertia/components/boats/show/tabs/NavigationLogForm.vue'

const mockIsOnline = vi.hoisted(() => ({ value: true }))
const mockEnqueue = vi.hoisted(() => vi.fn())
const mockFormPost = vi.hoisted(() => vi.fn())
const mockFormData = vi.hoisted(() => vi.fn(() => ({ departedAt: '2026-06-25T10:00', notes: '' })))

vi.mock('@inertiajs/vue3', () => ({
  useForm: () => ({
    departedAt: '2026-06-25T10:00',
    departurePortId: '',
    departurePortName: '',
    engineHoursStart: '',
    windForceBeaufort: '',
    seaState: '',
    crewCount: '',
    notes: '',
    errors: {},
    processing: false,
    post: mockFormPost,
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

const boatId = 7
const portOptions: never[] = []

describe('NavigationLogForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsOnline.value = true
  })

  test('online: submit calls form.post with the correct URL', async () => {
    const wrapper = mount(NavigationLogForm, { props: { boatId, portOptions } })
    await wrapper.find('form').trigger('submit')
    expect(mockFormPost).toHaveBeenCalledWith(
      '/boats/7/navigation-logs',
      expect.objectContaining({ preserveScroll: true })
    )
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  test('offline: submit calls enqueue with correct payload and emits close', async () => {
    mockIsOnline.value = false
    const wrapper = mount(NavigationLogForm, { props: { boatId, portOptions } })
    await wrapper.find('form').trigger('submit')
    expect(mockEnqueue).toHaveBeenCalledWith({
      type: 'create-navigation-log',
      url: '/boats/7/navigation-logs',
      method: 'post',
      payload: expect.any(Object),
    })
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(mockFormPost).not.toHaveBeenCalled()
  })

  test('offline: does not submit to server after enqueue', async () => {
    mockIsOnline.value = false
    const wrapper = mount(NavigationLogForm, { props: { boatId, portOptions } })
    await wrapper.find('form').trigger('submit')
    expect(mockFormPost).not.toHaveBeenCalled()
  })

  test('cancel button emits close', async () => {
    const wrapper = mount(NavigationLogForm, { props: { boatId, portOptions } })
    await wrapper.find('button[type="button"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
