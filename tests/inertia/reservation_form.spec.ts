import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockFormPost = vi.hoisted(() => vi.fn())
const mockFormReset = vi.hoisted(() => vi.fn())

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
    post: mockFormPost,
    reset: mockFormReset,
    transform: vi.fn(() => form),
  }
  return {
    useForm: () => form,
    usePage: () => ({ props: { appT: {}, locale: 'en' } }),
  }
})

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

  test('renders a client selector from the client options', () => {
    const wrapper = mount(ReservationForm, {
      props: {
        boatId: 1,
        clientOptions: [
          { id: 3, fullName: 'Alice Martin', status: 'active' },
          { id: 4, fullName: 'Bob Blake', status: 'blacklisted' },
        ],
      },
    })
    expect(wrapper.text()).toContain('Alice Martin')
    expect(wrapper.text()).toContain('Bob Blake')
  })
})
