import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockFormPatch = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/vue3', () => {
  const form: Record<string, unknown> = {
    startsAt: '',
    endsAt: '',
    clientId: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    status: 'option',
    notes: '',
    totalPrice: '',
    errors: {},
    processing: false,
    patch: mockFormPatch,
    transform: vi.fn(() => form),
  }
  return {
    useForm: () => form,
    usePage: () => ({ props: { appT: {}, locale: 'en' } }),
  }
})

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template:
      '<button :type="type" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled', 'route'],
    emits: ['click'],
  },
}))

vi.mock('~/components/base/BaseModal.vue', () => ({
  default: {
    template: '<div v-if="open"><slot /></div>',
    props: ['open', 'title', 'size'],
    emits: ['update:open'],
  },
}))

import ReservationEditModal from '../../inertia/components/reservations/ReservationEditModal.vue'
import type { BoatReservationRow } from '../../shared/types/reservation'

const reservation: BoatReservationRow = {
  id: 1,
  boatId: 5,
  boatName: 'Mistral',
  organizationId: 10,
  status: 'confirmed',
  startsAt: '2026-06-01T10:00:00.000Z',
  endsAt: '2026-06-07T10:00:00.000Z',
  clientName: 'Alice Martin',
  clientEmail: 'alice@example.com',
  clientPhone: null,
  notes: null,
  totalPrice: '1500',
  createdAt: '2026-05-01T00:00:00.000Z',
}

describe('ReservationEditModal', () => {
  beforeEach(() => vi.clearAllMocks())

  test('submit calls form.patch with correct URL', async () => {
    const wrapper = mount(ReservationEditModal, {
      props: { open: true, boatId: 5, reservation },
    })
    await wrapper.find('form').trigger('submit')
    expect(mockFormPatch).toHaveBeenCalledWith(
      '/boats/5/reservations/1',
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('does not submit when reservation is null', async () => {
    const wrapper = mount(ReservationEditModal, {
      props: { open: true, boatId: 5, reservation: null },
    })
    await wrapper.find('form').trigger('submit')
    expect(mockFormPatch).not.toHaveBeenCalled()
  })

  test('cancel button emits update:open false', async () => {
    const wrapper = mount(ReservationEditModal, {
      props: { open: true, boatId: 5, reservation },
    })
    await wrapper.find('button[type="button"]').trigger('click')
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })

  test('does not render form when closed', () => {
    const wrapper = mount(ReservationEditModal, {
      props: { open: false, boatId: 5, reservation },
    })
    expect(wrapper.find('form').exists()).toBe(false)
  })
})
