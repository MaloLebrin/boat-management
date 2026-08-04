import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import SignupTermsCheckbox from '../../inertia/components/auth/signup/SignupTermsCheckbox.vue'

/**
 * Les mentions légales du signup pointaient sur `href="#"` (#455) : la case
 * « J'accepte les CGU et la politique de confidentialité » ne menait nulle part.
 */
const mockLocale = vi.hoisted(() => ({ value: 'fr' as 'fr' | 'en' }))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: mockLocale.value } }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    name: 'MockInertiaLink',
    props: { href: { type: String, required: false } },
    template: '<a :href="href"><slot /></a>',
  },
}))

function hrefs() {
  const wrapper = mount(SignupTermsCheckbox, { props: {} })
  return wrapper.findAll('a').map((a) => a.attributes('href'))
}

describe('SignupTermsCheckbox — liens légaux (#455)', () => {
  test('la locale fr pointe sur les pages françaises', () => {
    mockLocale.value = 'fr'

    expect(hrefs()).toEqual(['/fr/cgu', '/fr/confidentialite'])
  })

  test('la locale en pointe sur les pages anglaises', () => {
    mockLocale.value = 'en'

    expect(hrefs()).toEqual(['/en/terms', '/en/privacy'])
  })

  test('aucun lien mort', () => {
    mockLocale.value = 'fr'

    expect(hrefs()).not.toContain('#')
    expect(hrefs().every((href) => href?.startsWith('/'))).toBe(true)
  })

  test('les liens ouvrent un nouvel onglet pour ne pas perdre le formulaire', () => {
    mockLocale.value = 'fr'
    const wrapper = mount(SignupTermsCheckbox, { props: {} })

    for (const link of wrapper.findAll('a')) {
      expect(link.attributes('target')).toBe('_blank')
      expect(link.attributes('rel')).toBe('noopener')
    }
  })
})
