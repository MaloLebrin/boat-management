import { mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import { test, expect, vi, describe } from 'vitest'

/**
 * Pavillon d'un bateau et pays d'un port en liste fermée (#580).
 *
 * `useCountries()` lit la locale de l'app via `useT()` : le mock doit donc
 * exposer `locale` en plus de `t`, sans quoi le composable n'a plus de locale
 * du tout et retomberait sur le repli anglais.
 */
const locale = ref('fr')

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key, locale: computed(() => locale.value) }),
}))

vi.mock('@inertiajs/vue3', () => ({
  useForm: (data: Record<string, unknown>) => ({ ...data, errors: {}, processing: false }),
  Head: { template: '<div><slot /></div>' },
  router: { reload: vi.fn() },
}))

import { COUNTRY_CODES } from '../../shared/constants/countries'
import BoatFormLegalFields from '../../inertia/components/boats/hull/BoatFormLegalFields.vue'
import PortsNew from '../../inertia/pages/ports/new.vue'

function mountLegalFields(flagCountry = '') {
  return mount(BoatFormLegalFields, {
    props: {
      errors: {},
      navigationCategory: '',
      maxPersons: '',
      hullIdentificationNumber: '',
      francisationNumber: '',
      flagCountry,
    },
  })
}

describe('BoatFormLegalFields — pavillon', () => {
  test('rend un select pays et non plus un champ texte libre', () => {
    const w = mountLegalFields()

    expect(w.find('select#flagCountry').exists()).toBe(true)
    expect(w.find('select[name="flagCountry"]').exists()).toBe(true)
    expect(w.find('input[name="flagCountry"]').exists()).toBe(false)
  })

  test('propose les 249 pays plus une option vide', () => {
    const options = mountLegalFields().findAll('select#flagCountry option')

    expect(options.length).toBe(COUNTRY_CODES.length + 1)
    expect(options[0].attributes('value')).toBe('')
  })

  test('ouvre la liste sur les pavillons maritimes courants, pas sur l’alphabet', () => {
    const options = mountLegalFields().findAll('select#flagCountry option')
    const values = options.slice(1, 12).map((o) => o.attributes('value'))

    expect(values).toEqual(['FR', 'GB', 'BE', 'NL', 'DE', 'ES', 'IT', 'PT', 'CH', 'MT', 'PL'])
  })

  test('rend les libellés dans la locale de l’app', () => {
    const options = mountLegalFields().findAll('select#flagCountry option')

    expect(options[1].text()).toBe('France')
    expect(options.find((o) => o.attributes('value') === 'DE')!.text()).toBe('Allemagne')
  })

  /**
   * Le reste de la liste est trié sur le **libellé traduit** : un ordre sur les
   * codes donnerait « Allemagne » après « Afghanistan » mais aussi après
   * « Åland », ce qui ne veut rien dire pour qui lit la liste.
   */
  test('trie le reste de la liste sur le libellé traduit', () => {
    const labels = mountLegalFields()
      .findAll('select#flagCountry option')
      .slice(12)
      .map((o) => o.text())

    expect(labels).toEqual([...labels].sort(new Intl.Collator('fr-FR').compare))
  })

  test('présélectionne la valeur déjà enregistrée', () => {
    expect(mountLegalFields('IT').find<HTMLSelectElement>('select#flagCountry').element.value).toBe(
      'IT'
    )
  })
})

describe('Formulaire port — pays', () => {
  test('rend un select pays sans le maxlength qui bloquait la saisie à 2 caractères', () => {
    const w = mount(PortsNew)

    expect(w.find('select#country').exists()).toBe(true)
    expect(w.find('select[name="country"]').exists()).toBe(true)
    expect(w.find('input[name="country"]').exists()).toBe(false)
    expect(w.find('select#country').attributes('maxlength')).toBeUndefined()
  })

  test('propose la même liste que le formulaire bateau, option vide comprise', () => {
    const options = mount(PortsNew).findAll('select#country option')

    expect(options.length).toBe(COUNTRY_CODES.length + 1)
    expect(options[0].attributes('value')).toBe('')
    expect(options[1].attributes('value')).toBe('FR')
    expect(options[1].text()).toBe('France')
  })
})
