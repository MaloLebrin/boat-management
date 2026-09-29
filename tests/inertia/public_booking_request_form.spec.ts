import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockPost = vi.hoisted(() => vi.fn())
const form = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))

vi.mock('@inertiajs/vue3', () => ({
  useForm: (initial: Record<string, unknown>) => {
    form.current = { ...initial, errors: {}, processing: false, post: mockPost, reset: vi.fn() }
    return form.current
  },
  usePage: () => ({ props: { appT: {}, locale: 'fr' } }),
}))

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}(${Object.values(params).join('|')})` : key,
    locale: { value: 'fr' },
  }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button :type="type" :disabled="disabled"><slot /></button>',
    props: ['type', 'disabled'],
  },
}))

import PublicBookingRequestForm from '../../inertia/components/public_booking/PublicBookingRequestForm.vue'

/** Formulaire de demande de la page publique (#881). */
describe('PublicBookingRequestForm (#881)', () => {
  beforeEach(() => mockPost.mockReset())

  test('without dates, the submit button is disabled and asks for them', () => {
    const wrapper = mount(PublicBookingRequestForm, {
      props: { action: '/book/acme/ondine/request', orgName: 'Acme', selection: null },
    })
    const button = wrapper.find('[data-testid="public-booking-submit"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('public.booking.form.pickDates')
  })

  test('posts the selected dates and the page locale', async () => {
    const wrapper = mount(PublicBookingRequestForm, {
      props: {
        action: '/book/acme/ondine/request',
        orgName: 'Acme',
        selection: { startsOn: '2031-07-04', endsOn: '2031-07-07' },
      },
    })
    await wrapper.find('form').trigger('submit')

    expect(mockPost).toHaveBeenCalledWith('/book/acme/ondine/request', expect.any(Object))
    expect(form.current.startsOn).toBe('2031-07-04')
    expect(form.current.endsOn).toBe('2031-07-07')
    expect(form.current.locale).toBe('fr')
  })

  test('the honeypot is hidden from humans and keyboard users', () => {
    const wrapper = mount(PublicBookingRequestForm, {
      props: { action: '/x', orgName: 'Acme', selection: null },
    })
    const trap = wrapper.find('#booking-website')
    expect(trap.attributes('tabindex')).toBe('-1')
    expect(trap.element.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  test('the consent names the company and the retention', () => {
    const wrapper = mount(PublicBookingRequestForm, {
      props: { action: '/x', orgName: 'Acme', selection: null },
    })
    expect(wrapper.text()).toContain('public.booking.form.consent(Acme|30)')
  })
})
