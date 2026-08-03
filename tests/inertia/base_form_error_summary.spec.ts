import { mount } from '@vue/test-utils'
import { describe, test, expect, vi } from 'vitest'

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return { ...actual, usePage: vi.fn() }
})

import { usePage } from '@inertiajs/vue3'
import BaseFormErrorSummary from '../../inertia/components/base/BaseFormErrorSummary.vue'
import type { FormErrors } from '../../inertia/utils/form_errors'

const appT = {
  'common.formErrors.title': 'Le formulaire contient des erreurs',
}

function mountSummary(props: { errors?: FormErrors; handledKeys?: string[]; title?: string }) {
  vi.mocked(usePage).mockReturnValue({ props: { appT, locale: 'fr' } } as ReturnType<
    typeof usePage
  >)
  return mount(BaseFormErrorSummary, { props })
}

describe('BaseFormErrorSummary (#448)', () => {
  test('renders nothing without errors', () => {
    expect(mountSummary({}).find('[data-testid="form-error-summary"]').exists()).toBe(false)
    expect(mountSummary({ errors: {} }).find('[data-testid="form-error-summary"]').exists()).toBe(
      false
    )
  })

  test('renders nothing when every error is rendered next to its own input', () => {
    const w = mountSummary({
      errors: { email: 'Email invalide' },
      handledKeys: ['email'],
    })

    expect(w.find('[data-testid="form-error-summary"]').exists()).toBe(false)
  })

  test('surfaces the error of a field the page does not render', () => {
    // The exact #448 failure: `passwordConfirmation` had no input, so its
    // error was dropped and the signup failed with zero feedback.
    const w = mountSummary({
      errors: {
        email: 'Email invalide',
        passwordConfirmation: 'La confirmation ne correspond pas.',
      },
      handledKeys: ['email', 'password'],
    })

    const summary = w.find('[data-testid="form-error-summary"]')
    expect(summary.exists()).toBe(true)
    expect(summary.text()).toContain('La confirmation ne correspond pas.')
    // Errors already shown under their input are not repeated.
    expect(summary.text()).not.toContain('Email invalide')
  })

  test('shows every unhandled error, including array-shaped ones', () => {
    const w = mountSummary({
      errors: { acceptTerms: ['Doit être accepté.', 'Second message'], foo: 'Bar' },
    })

    const items = w.findAll('li')
    expect(items.map((i) => i.text())).toEqual(['Doit être accepté.', 'Second message', 'Bar'])
  })

  test('uses the translated default title and honours an explicit one', () => {
    expect(mountSummary({ errors: { foo: 'Bar' } }).text()).toContain(
      'Le formulaire contient des erreurs'
    )
    expect(mountSummary({ errors: { foo: 'Bar' }, title: 'Inscription refusée' }).text()).toContain(
      'Inscription refusée'
    )
  })

  test('ignores empty and non-string error values', () => {
    const w = mountSummary({ errors: { a: '', b: undefined, c: [], d: 'Réel' } })

    expect(w.findAll('li').map((i) => i.text())).toEqual(['Réel'])
  })
})
