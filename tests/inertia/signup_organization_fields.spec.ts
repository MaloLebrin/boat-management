import { mount } from '@vue/test-utils'
import { describe, test, expect, vi } from 'vitest'

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return { ...actual, usePage: vi.fn() }
})

import { usePage } from '@inertiajs/vue3'
import SignupOrganizationFields from '../../inertia/components/auth/signup/SignupOrganizationFields.vue'
import { FLEET_SIZES, ORGANIZATION_TYPES } from '../../shared/types/organization'
import type { FormErrors } from '../../inertia/utils/form_errors'

const appT = {
  'auth.signup.section02Title': 'Votre organisation',
  'auth.signup.section02Sub': 'Vous pourrez renommer ensuite',
  'auth.signup.orgNameLabel': "Nom de l'organisation",
  'auth.signup.orgTypeLabel': 'Type',
  'auth.signup.fleetSizeLabel': 'Taille de flotte',
  'common.selectPlaceholder': 'Sélectionner...',
}

function mountFields(errors?: FormErrors) {
  vi.mocked(usePage).mockReturnValue({ props: { appT, locale: 'fr' } } as ReturnType<
    typeof usePage
  >)
  return mount(SignupOrganizationFields, { props: { errors } })
}

describe('SignupOrganizationFields (#448)', () => {
  test('posts the three organization fields the validator expects', () => {
    const w = mountFields()
    const names = w.findAll('input, select').map((el) => el.attributes('name'))

    expect(names).toEqual(['organizationName', 'organizationType', 'fleetSize'])
  })

  test('offers exactly the values the shared enums (and the validator) accept', () => {
    const w = mountFields()

    const typeValues = w
      .find('#organizationType')
      .findAll('option')
      .map((o) => o.attributes('value'))
    const sizeValues = w
      .find('#fleetSize')
      .findAll('option')
      .map((o) => o.attributes('value'))

    // The leading '' is the "no answer" option — both selects are optional.
    expect(typeValues).toEqual(['', ...ORGANIZATION_TYPES])
    expect(sizeValues).toEqual(['', ...FLEET_SIZES])
  })

  test('shows a server error under the field it belongs to', () => {
    const w = mountFields({ organizationName: 'Ce nom est déjà pris.' })

    expect(w.text()).toContain('Ce nom est déjà pris.')
    expect(w.find('#organizationName').attributes('aria-invalid')).toBe('true')
    expect(w.find('#fleetSize').attributes('aria-invalid')).toBeUndefined()
  })
})
