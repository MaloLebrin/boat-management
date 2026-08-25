import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import BoatIncidentForm from '../../inertia/components/boats/show/tabs/BoatIncidentForm.vue'
import type { BoatIncidentRow } from '../../inertia/types/boat_show'

/**
 * #489 — conversion `<Form>` → `useForm` + chemin hors-ligne. L'assertion la
 * plus importante : `tzOffsetMinutes` est figé à la soumission (pas à la
 * construction, pas au rejeu) — un incident saisi hors-ligne puis synchronisé
 * après un changement de fuseau resterait sinon daté faux, sans signal (#452).
 */

const mockIsOnline = vi.hoisted(() => ({ value: true }))
const mockEnqueue = vi.hoisted(() => vi.fn())
const mockFormPost = vi.hoisted(() => vi.fn())
const mockFormPut = vi.hoisted(() => vi.fn())
const mockTz = vi.hoisted(() => ({ value: -600 }))

const mockForm = vi.hoisted(() => {
  const form: Record<string, unknown> = {
    occurredAt: '',
    tzOffsetMinutes: 0,
    type: 'other',
    status: 'open',
    location: '',
    description: '',
    insuranceClaimed: false,
    insuranceClaimRef: '',
    errors: {} as Record<string, string>,
    processing: false,
  }
  form.post = mockFormPost
  form.put = mockFormPut
  form.data = () => {
    const { post, put, data, errors, processing, ...fields } = form
    return { ...fields }
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
}))

vi.mock('~/utils/local_datetime', () => ({
  tzOffsetMinutes: () => mockTz.value,
  isoToDatetimeLocalValue: (iso: string) => iso.slice(0, 16),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button :type="type" :disabled="disabled"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled', 'route'],
  },
}))

vi.mock('~/components/base/BaseInput.vue', () => ({
  default: {
    template: '<input :value="modelValue" :name="name" />',
    props: ['modelValue', 'label', 'errors', 'error', 'name', 'type', 'id', 'required', 'class'],
    emits: ['update:modelValue'],
  },
}))

vi.mock('~/components/base/BaseSelect.vue', () => ({
  default: {
    template:
      '<select :value="modelValue" :name="name"><option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'label', 'errors', 'error', 'name', 'options', 'id', 'required'],
    emits: ['update:modelValue'],
  },
}))

vi.mock('~/components/base/BaseTextarea.vue', () => ({
  default: {
    template:
      '<div><textarea :value="modelValue" :name="name" /><span v-if="error">{{ error }}</span></div>',
    props: ['modelValue', 'label', 'errors', 'error', 'name', 'rows', 'required', 'class'],
    emits: ['update:modelValue'],
  },
}))

const sampleIncident: BoatIncidentRow = {
  id: 42,
  type: 'grounding',
  status: 'open',
  occurredAt: '2026-06-25T10:00:00.000Z',
  location: 'Port',
  description: 'Test incident',
  insuranceClaimed: false,
  insuranceClaimRef: null,
}

describe('BoatIncidentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsOnline.value = true
    mockTz.value = -600
    mockForm.errors = {}
  })

  test('create mode online: submits via form.post to /boats/{boatId}/incidents', async () => {
    const wrapper = mount(BoatIncidentForm, {
      props: { boatId: 7, editingIncident: null },
    })

    await wrapper.find('form').trigger('submit')

    expect(mockFormPost).toHaveBeenCalledWith(
      '/boats/7/incidents',
      expect.objectContaining({ preserveScroll: true })
    )
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  test('edit mode online: submits via form.put to /boats/{boatId}/incidents/{id}', async () => {
    const wrapper = mount(BoatIncidentForm, {
      props: { boatId: 7, editingIncident: sampleIncident },
    })

    await wrapper.find('form').trigger('submit')

    expect(mockFormPut).toHaveBeenCalledWith(
      '/boats/7/incidents/42',
      expect.objectContaining({ preserveScroll: true })
    )
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  test('validation errors from form.errors reach the fields', () => {
    mockForm.errors = { description: 'La description est obligatoire' }
    const wrapper = mount(BoatIncidentForm, {
      props: { boatId: 7, editingIncident: null },
    })

    expect(wrapper.text()).toContain('La description est obligatoire')
  })

  test('offline: enqueues the creation with the full payload, no network call', async () => {
    mockIsOnline.value = false
    const wrapper = mount(BoatIncidentForm, {
      props: { boatId: 7, editingIncident: null },
    })

    await wrapper.find('form').trigger('submit')

    expect(mockEnqueue).toHaveBeenCalledWith({
      type: 'create-incident',
      url: '/boats/7/incidents',
      method: 'post',
      payload: expect.objectContaining({ type: 'other', tzOffsetMinutes: -600 }),
    })
    expect(mockFormPost).not.toHaveBeenCalled()
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  test('offline edit: enqueues the update with put method', async () => {
    mockIsOnline.value = false
    const wrapper = mount(BoatIncidentForm, {
      props: { boatId: 7, editingIncident: sampleIncident },
    })

    await wrapper.find('form').trigger('submit')

    expect(mockEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'update-incident',
        url: '/boats/7/incidents/42',
        method: 'put',
      })
    )
    expect(mockFormPut).not.toHaveBeenCalled()
  })

  test('tzOffsetMinutes is frozen at submit time and not recomputed afterwards', async () => {
    mockIsOnline.value = false
    const wrapper = mount(BoatIncidentForm, {
      props: { boatId: 7, editingIncident: null },
    })

    // Saisie faite en UTC+10 (offset -600)
    await wrapper.find('form').trigger('submit')
    const queuedPayload = mockEnqueue.mock.calls[0][0].payload as Record<string, unknown>
    expect(queuedPayload.tzOffsetMinutes).toBe(-600)

    // Changement de fuseau après la mise en file : le payload déjà enfilé ne
    // bouge pas — c'est lui qui sera rejoué tel quel par la file
    mockTz.value = 120
    expect(queuedPayload.tzOffsetMinutes).toBe(-600)

    // Une nouvelle soumission, elle, part avec le fuseau du moment
    await wrapper.find('form').trigger('submit')
    const secondPayload = mockEnqueue.mock.calls[1][0].payload as Record<string, unknown>
    expect(secondPayload.tzOffsetMinutes).toBe(120)
  })

  test('cancel button emits close', async () => {
    const wrapper = mount(BoatIncidentForm, {
      props: { boatId: 7, editingIncident: null },
    })
    await wrapper.find('button[type="button"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  test('queue type labels are translated in both locales', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    for (const locale of ['en', 'fr'] as const) {
      const json = JSON.parse(
        readFileSync(resolve(__dirname, `../../resources/lang/${locale}/common.json`), 'utf8')
      ) as Record<string, string>
      for (const type of ['create-incident', 'update-incident']) {
        expect(
          json[`offline.queue.type.${type}`],
          `offline.queue.type.${type} (${locale})`
        ).toBeTruthy()
      }
    }
  })
})
