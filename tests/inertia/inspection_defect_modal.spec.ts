import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

/**
 * #491 — conversion `<Form>` → `useForm` + chemin hors-ligne sur les défauts
 * d'inspection. Limite assumée : un défaut ne peut viser qu'une inspection
 * déjà créée en ligne — hors-ligne sans `inspectionId`, l'ajout est refusé
 * avec un message plutôt que d'échouer silencieusement au rejeu.
 */

const mockIsOnline = vi.hoisted(() => ({ value: true }))
const mockEnqueue = vi.hoisted(() => vi.fn())
const mockFormPost = vi.hoisted(() => vi.fn())
const mockTransform = vi.hoisted(() => vi.fn())

const mockForm = vi.hoisted(() => {
  const form: Record<string, unknown> = {
    label: '',
    actionType: 'to_repair',
    equipmentType: '',
    notes: '',
    estimatedCost: '',
    errors: {} as Record<string, string>,
    processing: false,
    reset: vi.fn(),
    clearErrors: vi.fn(),
  }
  form.transform = (cb: () => Record<string, unknown>) => {
    mockTransform(cb())
    return { post: mockFormPost }
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
  isTempId: (value: unknown) => typeof value === 'string' && value.startsWith('tmp_'),
}))

vi.mock('~/components/base/BaseModal.vue', () => ({
  default: {
    template: '<div><slot /></div>',
    props: ['open', 'title', 'size'],
    emits: ['update:open'],
  },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button :type="type" :disabled="disabled"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled'],
  },
}))

vi.mock('~/components/base/BaseInput.vue', () => ({
  default: {
    template:
      '<div><input :name="name" :value="modelValue" /><span v-if="error">{{ error }}</span></div>',
    props: [
      'modelValue',
      'label',
      'errors',
      'error',
      'name',
      'type',
      'id',
      'required',
      'step',
      'min',
    ],
    emits: ['update:modelValue'],
  },
}))

vi.mock('~/components/base/BaseSelect.vue', () => ({
  default: {
    template: '<select :name="name" :value="modelValue" />',
    props: [
      'modelValue',
      'label',
      'errors',
      'error',
      'name',
      'options',
      'id',
      'required',
      'allowEmpty',
    ],
    emits: ['update:modelValue'],
  },
}))

vi.mock('~/components/base/BaseTextarea.vue', () => ({
  default: {
    template: '<textarea :name="name" :value="modelValue" />',
    props: ['modelValue', 'label', 'errors', 'error', 'name', 'rows', 'id'],
    emits: ['update:modelValue'],
  },
}))

import InspectionDefectModal from '../../inertia/components/reservations/inspection/InspectionDefectModal.vue'

const baseProps = { boatId: 3, reservationId: 7, inspectionId: 9, open: true }
const ACTION_URL = '/boats/3/reservations/7/inspections/9/equipment-actions'

describe('InspectionDefectModal — hors-ligne (#491, #622)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsOnline.value = true
    mockForm.label = ''
    mockForm.equipmentType = ''
    mockForm.notes = ''
    mockForm.estimatedCost = ''
    mockForm.errors = {}
  })

  test('online: submits via form.post with empty optional fields stripped', async () => {
    const wrapper = mount(InspectionDefectModal, { props: baseProps })
    mockForm.label = 'Winch grippé'

    await wrapper.find('form').trigger('submit')

    expect(mockFormPost).toHaveBeenCalledWith(
      ACTION_URL,
      expect.objectContaining({ preserveScroll: true })
    )
    expect(mockTransform).toHaveBeenCalledWith({ label: 'Winch grippé', actionType: 'to_repair' })
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  test('online: filled optional fields are sent with estimatedCost as a number', async () => {
    const wrapper = mount(InspectionDefectModal, { props: baseProps })
    mockForm.label = 'Winch grippé'
    mockForm.equipmentType = 'engine'
    mockForm.notes = 'à voir'
    mockForm.estimatedCost = '120.5'

    await wrapper.find('form').trigger('submit')

    expect(mockTransform).toHaveBeenCalledWith({
      label: 'Winch grippé',
      actionType: 'to_repair',
      equipmentType: 'engine',
      notes: 'à voir',
      estimatedCost: 120.5,
    })
  })

  test('validation errors reach the fields', () => {
    mockForm.errors = { label: 'Le libellé est obligatoire' }
    const wrapper = mount(InspectionDefectModal, { props: baseProps })

    expect(wrapper.text()).toContain('Le libellé est obligatoire')
  })

  test('offline with a synced inspection: enqueues the defect and closes', async () => {
    mockIsOnline.value = false
    const wrapper = mount(InspectionDefectModal, { props: baseProps })
    mockForm.label = 'Voile déchirée'

    await wrapper.find('form').trigger('submit')

    expect(mockEnqueue).toHaveBeenCalledWith({
      type: 'create-inspection-defect',
      url: ACTION_URL,
      method: 'post',
      payload: { label: 'Voile déchirée', actionType: 'to_repair' },
    })
    expect(mockFormPost).not.toHaveBeenCalled()
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })

  test('offline without a synced inspection: refuses with a message, no enqueue', async () => {
    mockIsOnline.value = false
    mockForm.label = 'Voile déchirée'
    const wrapper = mount(InspectionDefectModal, {
      props: { ...baseProps, inspectionId: null },
    })

    expect(wrapper.text()).toContain('equipmentActions.defects.offlineNoInspection')
    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.attributes('disabled')).toBeDefined()

    await wrapper.find('form').trigger('submit')

    expect(mockEnqueue).not.toHaveBeenCalled()
    expect(mockFormPost).not.toHaveBeenCalled()
  })

  test('offline on an inspection still queued: enqueues with dependsOn on the temp id', async () => {
    mockIsOnline.value = false
    const wrapper = mount(InspectionDefectModal, {
      props: { ...baseProps, inspectionId: 'tmp_abc123' },
    })
    mockForm.label = 'Taquet arraché'

    await wrapper.find('form').trigger('submit')

    expect(mockEnqueue).toHaveBeenCalledWith({
      type: 'create-inspection-defect',
      url: '/boats/3/reservations/7/inspections/tmp_abc123/equipment-actions',
      method: 'post',
      payload: { label: 'Taquet arraché', actionType: 'to_repair' },
      dependsOn: 'tmp_abc123',
    })
    expect(wrapper.text()).not.toContain('equipmentActions.defects.offlineNoInspection')
  })

  test('a real inspection id never carries dependsOn', async () => {
    mockIsOnline.value = false
    const wrapper = mount(InspectionDefectModal, { props: baseProps })
    mockForm.label = 'Voile déchirée'

    await wrapper.find('form').trigger('submit')

    expect(mockEnqueue.mock.calls[0][0]).not.toHaveProperty('dependsOn')
  })

  test('online without inspectionId is not blocked by the offline guard', () => {
    const wrapper = mount(InspectionDefectModal, {
      props: { ...baseProps, inspectionId: null },
    })
    expect(wrapper.text()).not.toContain('equipmentActions.defects.offlineNoInspection')
  })

  test('queue type and guard message are translated in both locales', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    for (const locale of ['en', 'fr'] as const) {
      const common = JSON.parse(
        readFileSync(resolve(__dirname, `../../resources/lang/${locale}/common.json`), 'utf8')
      ) as Record<string, string>
      expect(
        common['offline.queue.type.create-inspection-defect'],
        `offline.queue.type.create-inspection-defect (${locale})`
      ).toBeTruthy()
      for (const key of [
        'offline.queue.type.create-inspection',
        'offline.queue.type.update-inspection',
        'offline.queue.dependsOn',
        'offline.failed.dependencyBlocked',
        'offline.conflict.descriptionInspection',
      ]) {
        expect(common[key], `${key} (${locale})`).toBeTruthy()
      }
      const ea = JSON.parse(
        readFileSync(
          resolve(__dirname, `../../resources/lang/${locale}/equipmentActions.json`),
          'utf8'
        )
      ) as { defects: Record<string, string> }
      expect(
        ea.defects.offlineNoInspection,
        `equipmentActions.defects.offlineNoInspection (${locale})`
      ).toBeTruthy()
    }
  })
})
