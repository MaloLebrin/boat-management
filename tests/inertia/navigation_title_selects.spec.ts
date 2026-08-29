import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { expect, test, vi } from 'vitest'
import { CLIENT_PERMIT_TYPES } from '../../shared/types/client'
import { NAVIGATION_TITLES } from '../../shared/types/navigation_title'

const mockFormPost = vi.hoisted(() => vi.fn())

// Le vrai `useForm` rend son état réactif : les formulaires testés ici
// s'appuient dessus (pré-remplissage piloté par un `watch`).
vi.mock('@inertiajs/vue3', () => ({
  useForm: (initial: Record<string, unknown>) =>
    reactive({
      ...initial,
      errors: {},
      processing: false,
      post: mockFormPost,
      put: vi.fn(),
      reset: vi.fn(),
    }),
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

import ClientForm from '../../inertia/components/clients/ClientForm.vue'
import CrewCertificationForm from '../../inertia/components/crew/CrewCertificationForm.vue'

function selectValues(html: ReturnType<typeof mount>, selector: string) {
  return html
    .get(selector)
    .findAll('option')
    .map((o) => o.attributes('value'))
    .filter((v) => v !== '')
}

/**
 * Les deux domaines lisent le même vocabulaire (#585) : le select des
 * certifications et celui des permis clients ne peuvent plus diverger.
 */
test('the crew certification select offers the whole shared vocabulary', () => {
  const w = mount(CrewCertificationForm, { props: { memberId: 1 } })
  expect(selectValues(w, 'select[name="type"]')).toEqual([...NAVIGATION_TITLES])
})

test('the client permit select offers the shared vocabulary plus "no permit"', () => {
  const w = mount(ClientForm, { props: { client: null } })
  const values = selectValues(w, 'select[name="navigationPermitType"]')
  expect(values).toEqual([...CLIENT_PERMIT_TYPES])
  expect(values).toContain('none')
  // Les valeurs historiques ne sont plus proposées à la saisie.
  expect(values).not.toContain('coastal')
})

test('a client saved with a legacy permit value keeps it selected', () => {
  const w = mount(ClientForm, {
    props: {
      client: {
        id: 1,
        firstName: 'Marc',
        lastName: 'Legrand',
        fullName: 'Marc Legrand',
        email: null,
        phone: null,
        address: null,
        navigationPermitNumber: null,
        navigationPermitType: 'coastal',
        status: 'active',
        notes: null,
        gdprConsentAt: null,
        anonymizedAt: null,
        createdAt: null,
        updatedAt: null,
      },
    },
  })

  const select = w.get('select[name="navigationPermitType"]')
    .element as unknown as HTMLSelectElement
  expect(select.value).toBe('coastal')
})

/**
 * Pré-remplissage non destructif de la date d'expiration (#585) : proposé sur
 * les titres qui se périment, jamais imposé.
 */
test('choosing a medical certificate suggests an expiry date', async () => {
  const w = mount(CrewCertificationForm, { props: { memberId: 1 } })

  await w.get('select[name="type"]').setValue('medical_certificate')

  const expiry = w.get('input[name="expiresAt"]').element as unknown as HTMLInputElement
  const expectedYear = new Date().getFullYear() + 2
  expect(expiry.value.slice(0, 4)).toBe(String(expectedYear))
})

test('a lifetime title suggests nothing', async () => {
  const w = mount(CrewCertificationForm, { props: { memberId: 1 } })

  await w.get('select[name="type"]').setValue('coastal_permit')

  const expiry = w.get('input[name="expiresAt"]').element as unknown as HTMLInputElement
  expect(expiry.value).toBe('')
})

test('a hand-typed expiry date survives a change of title', async () => {
  const w = mount(CrewCertificationForm, { props: { memberId: 1 } })

  await w.get('input[name="expiresAt"]').setValue('2030-01-15')
  await w.get('select[name="type"]').setValue('stcw_basic')

  const expiry = w.get('input[name="expiresAt"]').element as unknown as HTMLInputElement
  expect(expiry.value).toBe('2030-01-15')
})
