import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockFormPost = vi.hoisted(() => vi.fn())
const mockFormReset = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/vue3', () => ({
  useForm: () => ({
    startsAt: '',
    endsAt: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    status: 'option',
    notes: '',
    totalPrice: '',
    errors: {},
    processing: false,
    post: mockFormPost,
    reset: mockFormReset,
  }),
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button :type="type" :disabled="disabled"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled', 'route'],
  },
}))

import ReservationForm from '../../inertia/components/reservations/ReservationForm.vue'

describe('ReservationForm', () => {
  beforeEach(() => vi.clearAllMocks())

  test('submit calls form.post with the correct URL', async () => {
    const wrapper = mount(ReservationForm, { props: { boatId: 42 } })
    await wrapper.find('form').trigger('submit')
    expect(mockFormPost).toHaveBeenCalledWith(
      '/boats/42/reservations',
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('uses boatId prop in the URL', async () => {
    const wrapper = mount(ReservationForm, { props: { boatId: 7 } })
    await wrapper.find('form').trigger('submit')
    expect(mockFormPost).toHaveBeenCalledWith('/boats/7/reservations', expect.any(Object))
  })

  test('submit button is not disabled when not processing', () => {
    const wrapper = mount(ReservationForm, { props: { boatId: 1 } })
    const btn = wrapper.find('button[type="submit"]')
    expect(btn.attributes('disabled')).toBeUndefined()
  })
})
