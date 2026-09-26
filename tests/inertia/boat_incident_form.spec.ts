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
const mockFormPut = vi.hoisted(() => vi.fn())
const mockTz = vi.hoisted(() => ({ value: -600 }))
const mockRouterPost = vi.hoisted(() => vi.fn())
const mockToastError = vi.hoisted(() => vi.fn())

/**
 * Flash rendu par la page d'arrivée après la création. C'est par là que le
 * contrôleur rend l'id de l'incident, sans quoi le formulaire ne saurait pas
 * sur quelle route envoyer les photos.
 */
const mockFlash = vi.hoisted(() => ({
  value: { createdResourceType: 'create-incident', createdResourceId: 99 } as Record<
    string,
    unknown
  >,
}))

const mockFormPost = vi.hoisted(() =>
  vi.fn((_url: string, options?: { onSuccess?: (page: unknown) => void }) => {
    options?.onSuccess?.({ props: { flash: mockFlash.value } })
  })
)

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
  router: { post: mockRouterPost },
}))

vi.mock('vue-sonner', () => ({ toast: { error: mockToastError, success: vi.fn(), info: vi.fn() } }))

/**
 * Le vrai sélecteur lit des `File` du DOM ; ici un bouton suffit à en remonter
 * un, et `data-error` expose le message de refus « au moins une photo ».
 */
vi.mock('~/components/media/MediaPendingPhotoPicker.vue', () => ({
  default: {
    template:
      '<div data-testid="photo-picker" :data-error="error ?? \'\'" :data-disabled="disabled ? \'1\' : \'\'" :data-notice="notice ?? \'\'"><span data-testid="pick-photo" @click="pick" /></div>',
    props: ['modelValue', 'disabled', 'error', 'notice', 'maxFiles', 'maxSizeMb'],
    emits: ['update:modelValue', 'rejected'],
    methods: {
      pick(this: { $emit: (e: string, v: unknown) => void }) {
        this.$emit('update:modelValue', [new File(['x'], 'photo.jpg', { type: 'image/jpeg' })])
      },
    },
  },
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
  boatId: 7,
  type: 'grounding',
  status: 'open',
  occurredAt: '2026-06-25T10:00:00.000Z',
  location: 'Port',
  description: 'Test incident',
  insuranceClaimed: false,
  insuranceClaimRef: null,
  closedAt: null,
  createdAt: '2026-06-25T10:00:00.000Z',
  boatEngineId: null,
  boatSailId: null,
  boatRigId: null,
  boatSafetyEquipmentId: null,
  boatGenericEquipmentId: null,
  boatEnginePartId: null,
  target: null,
  photosCount: 0,
}

describe('BoatIncidentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsOnline.value = true
    mockTz.value = -600
    mockForm.errors = {}
    mockFlash.value = { createdResourceType: 'create-incident', createdResourceId: 99 }
  })

  /** Monte le formulaire de création et y dépose une photo, désormais requise. */
  async function mountWithPhoto(props: Record<string, unknown> = {}) {
    const wrapper = mount(BoatIncidentForm, {
      props: { boatId: 7, editingIncident: null, ...props },
    })
    await wrapper.find('[data-testid="pick-photo"]').trigger('click')
    return wrapper
  }

  test('create mode online: submits via form.post to /boats/{boatId}/incidents', async () => {
    const wrapper = await mountWithPhoto()

    await wrapper.find('form').trigger('submit')

    expect(mockFormPost).toHaveBeenCalledWith(
      '/boats/7/incidents',
      expect.objectContaining({ preserveScroll: true })
    )
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  test('create mode online: the photo follows on the incident photos route', async () => {
    const wrapper = await mountWithPhoto()

    await wrapper.find('form').trigger('submit')

    expect(mockRouterPost).toHaveBeenCalledWith(
      '/boats/7/incidents/99/photos',
      expect.objectContaining({ files: [expect.any(File)] }),
      expect.objectContaining({ forceFormData: true, preserveScroll: true })
    )
  })

  test('create mode online without a photo: nothing is posted, the field complains', async () => {
    const wrapper = mount(BoatIncidentForm, {
      props: { boatId: 7, editingIncident: null },
    })

    await wrapper.find('form').trigger('submit')

    expect(mockFormPost).not.toHaveBeenCalled()
    expect(mockRouterPost).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="photo-picker"]').attributes('data-error')).toBe(
      'incidents.form.photoRequired'
    )
  })

  test('a lost flash leaves the incident created and warns instead of retrying', async () => {
    mockFlash.value = {}
    const wrapper = await mountWithPhoto()

    await wrapper.find('form').trigger('submit')

    expect(mockRouterPost).not.toHaveBeenCalled()
    expect(mockToastError).toHaveBeenCalledWith('incidents.form.photoUploadFailed')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  test('resubmitting after a failed upload never creates a second incident', async () => {
    const wrapper = await mountWithPhoto()

    await wrapper.find('form').trigger('submit')
    await wrapper.find('form').trigger('submit')

    expect(mockFormPost).toHaveBeenCalledTimes(1)
    expect(mockRouterPost).toHaveBeenCalledTimes(2)
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
    // Exemption hors-ligne : aucune photo exigée, et le sélecteur l'explique.
    expect(wrapper.find('[data-testid="photo-picker"]').attributes('data-error')).toBe('')
    expect(wrapper.find('[data-testid="photo-picker"]').attributes('data-notice')).toBe(
      'incidents.form.photoOfflineNotice'
    )
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

  test('a locked target travels in the queued payload as its FK column (#813)', async () => {
    mockIsOnline.value = false
    const wrapper = mount(BoatIncidentForm, {
      props: {
        boatId: 7,
        editingIncident: null,
        prefill: { target: { type: 'engine', id: 12 } },
        lockTarget: true,
      },
    })

    expect(wrapper.find('[data-testid="incident-locked-target"]').exists()).toBe(true)
    await wrapper.find('form').trigger('submit')

    const payload = mockEnqueue.mock.calls[0][0].payload as Record<string, unknown>
    expect(payload.boatEngineId).toBe(12)
    expect(payload.boatSailId).toBeNull()
    expect(payload.boatEnginePartId).toBeNull()
  })

  test('editing sends every target column so the server can change or clear the target', async () => {
    mockIsOnline.value = false
    const wrapper = mount(BoatIncidentForm, {
      props: { boatId: 7, editingIncident: { ...sampleIncident, boatSailId: 3 } },
    })

    await wrapper.find('form').trigger('submit')

    const payload = mockEnqueue.mock.calls[0][0].payload as Record<string, unknown>
    expect(payload).toEqual(
      expect.objectContaining({
        boatEngineId: null,
        boatSailId: 3,
        boatRigId: null,
        boatSafetyEquipmentId: null,
        boatGenericEquipmentId: null,
        boatEnginePartId: null,
      })
    )
  })

  test('cancel button emits close', async () => {
    const wrapper = mount(BoatIncidentForm, {
      props: { boatId: 7, editingIncident: null },
    })
    await wrapper.find('[data-testid="incident-cancel"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  test('editing an incident without a photo hides the closed status', () => {
    const wrapper = mount(BoatIncidentForm, {
      props: { boatId: 7, editingIncident: { ...sampleIncident, photosCount: 0 } },
    })

    const labels = wrapper.findAll('option').map((o) => o.text())
    expect(labels).toContain('incidents.status.open')
    expect(labels).not.toContain('incidents.status.closed')
    expect(wrapper.text()).toContain('incidents.form.closedNeedsPhoto')
  })

  test('editing an incident with a photo keeps the closed status available', () => {
    const wrapper = mount(BoatIncidentForm, {
      props: { boatId: 7, editingIncident: { ...sampleIncident, photosCount: 1 } },
    })

    expect(wrapper.findAll('option').map((o) => o.text())).toContain('incidents.status.closed')
    expect(wrapper.text()).not.toContain('incidents.form.closedNeedsPhoto')
  })

  test('an already closed incident keeps the option even without a photo', () => {
    const wrapper = mount(BoatIncidentForm, {
      props: {
        boatId: 7,
        editingIncident: { ...sampleIncident, status: 'closed' as const, photosCount: 0 },
      },
    })

    expect(wrapper.findAll('option').map((o) => o.text())).toContain('incidents.status.closed')
  })

  test('the new photo keys exist in both locales', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    for (const locale of ['en', 'fr'] as const) {
      const json = JSON.parse(
        readFileSync(resolve(__dirname, `../../resources/lang/${locale}/incidents.json`), 'utf8')
      ) as { form: Record<string, string>; show: Record<string, string>; missingPhoto?: string }
      for (const key of [
        'photos',
        'photoHint',
        'photoRequired',
        'photoOfflineNotice',
        'photoUploading',
        'photoUploadFailed',
        'closedNeedsPhoto',
        'goToIncident',
      ]) {
        expect(json.form[key], `incidents.form.${key} (${locale})`).toBeTruthy()
      }
      expect(json.missingPhoto, `incidents.missingPhoto (${locale})`).toBeTruthy()
      expect(json.show.missingPhotoHint, `incidents.show.missingPhotoHint (${locale})`).toBeTruthy()
    }
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
