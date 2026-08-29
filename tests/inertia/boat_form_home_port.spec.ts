import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  router: { reload: vi.fn() },
}))

vi.mock('~/composables/use_t', async () => {
  const { ref } = await import('vue')
  return { useT: () => ({ t: (key: string) => key, locale: ref('fr') }) }
})

import BaseCombobox from '../../inertia/components/base/BaseCombobox.vue'
import BoatFormHullFields from '../../inertia/components/boats/hull/BoatFormHullFields.vue'

const PORTS = [
  { id: 4, name: 'Concarneau' },
  { id: 7, name: 'Port-la-Forêt' },
]

function mountFields(props: Record<string, unknown> = {}) {
  return mount(BoatFormHullFields, {
    props: {
      mode: 'create',
      propulsionType: '',
      showMastHeight: false,
      errors: {},
      ...props,
    },
  })
}

function homePortCombobox(w: ReturnType<typeof mountFields>) {
  return w.findAllComponents(BaseCombobox).find((c) => c.props('name') === 'homePort')!
}

test('le port d’attache est une combobox, champ de formulaire natif', () => {
  const w = mountFields({ portOptions: PORTS })

  expect(w.find('input#homePort[name="homePort"]').exists()).toBe(true)
  expect(homePortCombobox(w).props('options')).toEqual([
    { value: '4', label: 'Concarneau' },
    { value: '7', label: 'Port-la-Forêt' },
  ])
})

test('sans port enregistré, la combobox ne propose rien et invite à la saisie libre', () => {
  const w = mountFields()

  const combobox = homePortCombobox(w)
  expect(combobox.props('options')).toEqual([])
  expect(combobox.props('hint')).toBe('boats.homePortSuggest.freeTextHint')
})

test('choisir un port du référentiel écrit son nom canonique dans le champ', async () => {
  const w = mountFields({ portOptions: PORTS })

  await w
    .findAll('[role="option"]')
    .find((li) => li.text().includes('Port-la-Forêt'))!
    .trigger('mousedown')

  expect((w.find('input#homePort').element as HTMLInputElement).value).toBe('Port-la-Forêt')
})

test('une saisie hors référentiel est conservée telle quelle', async () => {
  const w = mountFields({ portOptions: PORTS })

  const input = w.find('input#homePort')
  await input.setValue('Marina de Bonifacio')

  expect((input.element as HTMLInputElement).value).toBe('Marina de Bonifacio')
})

test('la valeur existante du bateau alimente le champ à l’édition', () => {
  const w = mountFields({
    mode: 'edit',
    portOptions: PORTS,
    boat: { id: 1, name: 'Liberté', homePort: 'Port de passage', spotId: null },
  })

  expect((w.find('input#homePort').element as HTMLInputElement).value).toBe('Port de passage')
})
