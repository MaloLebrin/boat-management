import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ref } from 'vue'
import NavigationLogEntryQuickAdd from '../../inertia/components/boats/show/tabs/NavigationLogEntryQuickAdd.vue'

const mockIsOnline = vi.hoisted(() => ({ value: true }))
const mockEnqueue = vi.hoisted(() => vi.fn())
const mockFormPost = vi.hoisted(() => vi.fn())
const mockFormData = vi.hoisted(() => vi.fn())
const mockCapture = vi.hoisted(() => vi.fn())

const formState = vi.hoisted(() => ({
  recordedAt: '2026-08-29T10:00',
  tzOffsetMinutes: 0,
  latitude: null as number | null,
  longitude: null as number | null,
  gpsAccuracyM: null as number | null,
  cogDeg: null as number | null,
  sogKn: null as number | null,
  sailConfig: '',
  note: '',
}))

vi.mock('@inertiajs/vue3', () => ({
  useForm: () =>
    Object.assign(formState, {
      errors: {},
      processing: false,
      post: mockFormPost,
      data: mockFormData,
      reset: vi.fn(),
    }),
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/composables/use_network_status', () => ({
  useNetworkStatus: () => ({ isOnline: mockIsOnline }),
}))

vi.mock('~/composables/use_offline_queue', () => ({
  useOfflineQueue: () => ({ enqueue: mockEnqueue }),
}))

vi.mock('~/composables/use_gps_burst', () => ({
  useGpsBurst: () => ({
    state: ref('done'),
    errorKey: ref(null),
    result: ref(null),
    capture: mockCapture,
    reset: vi.fn(),
  }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button :type="type" :disabled="disabled"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled', 'route'],
  },
}))

describe('NavigationLogEntryQuickAdd', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsOnline.value = true
    Object.assign(formState, {
      recordedAt: '2026-08-29T10:00',
      tzOffsetMinutes: 0,
      latitude: null,
      longitude: null,
      gpsAccuracyM: null,
      cogDeg: null,
      sogKn: null,
      sailConfig: '',
      note: '',
    })
    mockCapture.mockResolvedValue({
      latitude: 47.2735,
      longitude: -2.2137,
      gpsAccuracyM: 6.5,
      cogDeg: 210,
      sogKn: 5.4,
    })
    mockFormData.mockReturnValue({ ...formState })
  })

  test('le tap lance la rafale GPS et pré-remplit le formulaire', async () => {
    const wrapper = mount(NavigationLogEntryQuickAdd, { props: { boatId: 7, logId: 5 } })

    await wrapper.find('button').trigger('click')
    await vi.waitFor(() => expect(mockCapture).toHaveBeenCalled())

    expect(formState.latitude).toBe(47.2735)
    expect(formState.longitude).toBe(-2.2137)
    expect(formState.cogDeg).toBe(210)
    expect(formState.sogKn).toBe(5.4)
  })

  test('online : submit poste sur la route entries', async () => {
    const wrapper = mount(NavigationLogEntryQuickAdd, { props: { boatId: 7, logId: 5 } })
    await wrapper.find('button').trigger('click')
    await vi.waitFor(() => expect(mockCapture).toHaveBeenCalled())

    await wrapper.find('form').trigger('submit')

    expect(mockFormPost).toHaveBeenCalledWith(
      '/boats/7/navigation-logs/5/entries',
      expect.objectContaining({ preserveScroll: true })
    )
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  test('offline : submit met le point en file avec le bon type', async () => {
    mockIsOnline.value = false
    const wrapper = mount(NavigationLogEntryQuickAdd, { props: { boatId: 7, logId: 5 } })
    await wrapper.find('button').trigger('click')
    await vi.waitFor(() => expect(mockCapture).toHaveBeenCalled())

    await wrapper.find('form').trigger('submit')

    expect(mockEnqueue).toHaveBeenCalledWith({
      type: 'create-navigation-log-entry',
      url: '/boats/7/navigation-logs/5/entries',
      method: 'post',
      payload: expect.any(Object),
    })
    expect(mockFormPost).not.toHaveBeenCalled()
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  test('la capture échouée laisse le formulaire utilisable sans coordonnées', async () => {
    mockCapture.mockResolvedValue(null)
    const wrapper = mount(NavigationLogEntryQuickAdd, { props: { boatId: 7, logId: 5 } })

    await wrapper.find('button').trigger('click')
    await vi.waitFor(() => expect(mockCapture).toHaveBeenCalled())

    expect(wrapper.find('form').exists()).toBe(true)
    expect(formState.latitude).toBeNull()
  })
})
