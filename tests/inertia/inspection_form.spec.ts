import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

/**
 * #622 — création d'état des lieux hors-ligne. Le formulaire enfile la création
 * avec un jeton temporaire (que les défauts référencent), et l'édition d'une
 * inspection déjà synchronisée part avec `_expectedUpdatedAt`.
 */

const mockIsOnline = vi.hoisted(() => ({ value: true }))
const mockEnqueue = vi.hoisted(() => vi.fn())
const mockFormPost = vi.hoisted(() => vi.fn())
const mockFormPut = vi.hoisted(() => vi.fn())
const mockTransform = vi.hoisted(() => vi.fn())

const mockForm = vi.hoisted(() => {
  const form: Record<string, unknown> = {
    performedAt: '',
    fuelLevel: '',
    engineHours: '',
    notes: '',
    tzOffsetMinutes: 0,
    errors: {} as Record<string, string>,
    processing: false,
  }
  form.transform = (cb: () => Record<string, unknown>) => {
    mockTransform(cb())
    return { post: mockFormPost, put: mockFormPut }
  }
  return form
})

vi.mock('@inertiajs/vue3', () => ({
  useForm: (initial: Record<string, unknown>) => {
    Object.assign(mockForm, initial)
    return mockForm
  },
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/composables/use_network_status', () => ({
  useNetworkStatus: () => ({ isOnline: mockIsOnline }),
}))

vi.mock('~/composables/use_offline_queue', () => ({
  useOfflineQueue: () => ({ enqueue: mockEnqueue }),
  newTempId: () => 'tmp_generated',
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button :type="type" :disabled="disabled"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled'],
  },
}))

vi.mock('~/components/base/BaseInput.vue', () => ({
  default: {
    template: '<div><input :name="name" :value="modelValue" /></div>',
    props: ['modelValue', 'label', 'error', 'name', 'type', 'id', 'required', 'step', 'min', 'max'],
    emits: ['update:modelValue'],
  },
}))

vi.mock('~/components/base/BaseTextarea.vue', () => ({
  default: {
    template: '<textarea :name="name" :value="modelValue" />',
    props: ['modelValue', 'label', 'errors', 'name', 'rows', 'id'],
    emits: ['update:modelValue'],
  },
}))

import InspectionForm from '../../inertia/components/reservations/inspection/InspectionForm.vue'

const CREATE_URL = '/boats/3/reservations/7/inspections'
const UPDATE_URL = '/boats/3/reservations/7/inspections/9'

const baseProps = {
  boatId: 3,
  reservationId: 7,
  kind: 'checkout' as const,
  inspection: null,
  pending: null,
}

const syncedInspection = {
  id: 9,
  reservationId: 7,
  kind: 'checkout' as const,
  performedAt: '2026-09-02T08:00:00.000+02:00',
  fuelLevel: 80,
  engineHours: '120.5',
  notes: 'RAS',
  createdAt: '2026-09-02T08:00:00.000+02:00',
  updatedAt: '2026-09-02T09:30:00.000+02:00',
  photos: [],
  actions: [],
  items: [],
}

describe('InspectionForm (#622)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsOnline.value = true
    mockForm.errors = {}
  })

  test('online creation posts to the collection url with the kind', async () => {
    const wrapper = mount(InspectionForm, { props: baseProps })
    mockForm.performedAt = '2026-09-02T10:00'

    await wrapper.find('form').trigger('submit')

    expect(mockFormPost).toHaveBeenCalledWith(CREATE_URL, { preserveScroll: true })
    expect(mockTransform).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'checkout', performedAt: '2026-09-02T10:00' })
    )
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  test('online creation strips empty optional fields', async () => {
    const wrapper = mount(InspectionForm, { props: baseProps })
    mockForm.performedAt = '2026-09-02T10:00'
    mockForm.fuelLevel = ''
    mockForm.engineHours = ''
    mockForm.notes = ''

    await wrapper.find('form').trigger('submit')

    const payload = mockTransform.mock.calls[0][0]
    expect(payload).not.toHaveProperty('fuelLevel')
    expect(payload).not.toHaveProperty('engineHours')
    expect(payload).not.toHaveProperty('notes')
  })

  test('offline creation enqueues with a temp id and a dedupe key', async () => {
    mockIsOnline.value = false
    const wrapper = mount(InspectionForm, { props: baseProps })
    mockForm.performedAt = '2026-09-02T10:00'
    mockForm.fuelLevel = '75'

    await wrapper.find('form').trigger('submit')

    expect(mockEnqueue).toHaveBeenCalledWith({
      type: 'create-inspection',
      url: CREATE_URL,
      method: 'post',
      payload: expect.objectContaining({
        kind: 'checkout',
        performedAt: '2026-09-02T10:00',
        fuelLevel: 75,
      }),
      dedupeKey: 'create-inspection:/boats/3/reservations/7:checkout',
      tempId: 'tmp_generated',
    })
    expect(mockFormPost).not.toHaveBeenCalled()
  })

  test('re-editing a queued inspection keeps its existing temp id', async () => {
    mockIsOnline.value = false
    const pending = {
      id: 'tmp_existing',
      kind: 'checkout' as const,
      performedAt: '2026-09-02T10:00',
      fuelLevel: 75,
      engineHours: null,
      notes: null,
      actions: [],
    }
    const wrapper = mount(InspectionForm, { props: { ...baseProps, pending } })
    mockForm.performedAt = '2026-09-02T11:30'

    await wrapper.find('form').trigger('submit')

    expect(mockEnqueue.mock.calls[0][0].tempId).toBe('tmp_existing')
  })

  test('a queued inspection pre-fills the form', () => {
    const pending = {
      id: 'tmp_existing',
      kind: 'checkout' as const,
      performedAt: '2026-09-02T10:00',
      fuelLevel: 75,
      engineHours: '30.5',
      notes: 'Plein fait',
      actions: [],
    }
    mount(InspectionForm, { props: { ...baseProps, pending } })

    expect(mockForm.performedAt).toBe('2026-09-02T10:00')
    expect(mockForm.fuelLevel).toBe('75')
    expect(mockForm.engineHours).toBe('30.5')
    expect(mockForm.notes).toBe('Plein fait')
  })

  test('offline edition enqueues a put carrying _expectedUpdatedAt', async () => {
    mockIsOnline.value = false
    const wrapper = mount(InspectionForm, {
      props: { ...baseProps, inspection: syncedInspection },
    })
    mockForm.performedAt = '2026-09-02T10:00'

    await wrapper.find('form').trigger('submit')

    expect(mockEnqueue).toHaveBeenCalledWith({
      type: 'update-inspection',
      url: UPDATE_URL,
      method: 'put',
      payload: expect.objectContaining({
        _expectedUpdatedAt: '2026-09-02T09:30:00.000+02:00',
      }),
      dedupeKey: `update-inspection:${UPDATE_URL}`,
    })
    // Une modification ne renvoie pas le `kind` (immuable côté backend).
    expect(mockEnqueue.mock.calls[0][0].payload).not.toHaveProperty('kind')
  })

  test('online edition puts without the conflict marker', async () => {
    const wrapper = mount(InspectionForm, {
      props: { ...baseProps, inspection: syncedInspection },
    })
    mockForm.performedAt = '2026-09-02T10:00'

    await wrapper.find('form').trigger('submit')

    expect(mockFormPut).toHaveBeenCalledWith(UPDATE_URL, { preserveScroll: true })
    expect(mockTransform.mock.calls[0][0]).not.toHaveProperty('_expectedUpdatedAt')
    expect(mockEnqueue).not.toHaveBeenCalled()
  })
})
