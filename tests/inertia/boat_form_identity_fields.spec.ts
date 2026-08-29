import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'

const reload = vi.fn()

vi.mock('@inertiajs/vue3', () => ({
  router: {
    reload: (...args: unknown[]) => reload(...args),
  },
}))

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

import BaseCombobox from '../../inertia/components/base/BaseCombobox.vue'
import BoatFormIdentityFields from '../../inertia/components/boats/hull/BoatFormIdentityFields.vue'

const BRANDS = [
  { id: 1, slug: 'beneteau', name: 'Bénéteau', country: 'FR', categories: ['sailboat_monohull'] },
  { id: 2, slug: 'zodiac', name: 'Zodiac', country: 'FR', categories: ['rib'] },
]

const MODELS = [
  {
    id: 10,
    slug: 'oceanis-46-1',
    name: 'Oceanis 46.1',
    category: 'sailboat_monohull',
    productionStartYear: null,
    productionEndYear: null,
  },
]

function mountFields(props: Record<string, unknown> = {}) {
  reload.mockClear()
  return mount(BoatFormIdentityFields, {
    props: {
      category: '',
      manufacturer: '',
      model: '',
      errors: {},
      brands: BRANDS,
      catalogModels: [],
      catalogBrandId: null,
      ...props,
    },
  })
}

function comboboxes(w: ReturnType<typeof mountFields>) {
  return w.findAllComponents(BaseCombobox)
}

test('rend un select de catégorie et deux comboboxes en champs de formulaire natifs', () => {
  const w = mountFields()

  expect(w.find('select#category').exists()).toBe(true)
  expect(w.find('select[name="category"]').exists()).toBe(true)
  expect(w.find('input[name="manufacturer"]').exists()).toBe(true)
  expect(w.find('input[name="model"]').exists()).toBe(true)
})

test('propose les catégories du vocabulaire traduit', () => {
  const w = mountFields()
  const options = w.findAll('select#category option')

  // 15 catégories + le placeholder vide
  expect(options.length).toBe(16)
  expect(w.text()).toContain('boats.options.category.sailboat_monohull')
})

test('priorise les marques de la catégorie choisie sans les filtrer', () => {
  const w = mountFields({ category: 'rib' })
  const brandOptions = comboboxes(w)[0].props('options') as Array<{ label: string }>

  expect(brandOptions[0].label).toBe('Zodiac')
  expect(brandOptions.map((o) => o.label)).toContain('Bénéteau')
})

test('choisir une marque recharge les modèles par visite Inertia partielle', async () => {
  const w = mountFields()

  comboboxes(w)[0].vm.$emit('select', { value: '1', label: 'Bénéteau' })
  await w.vm.$nextTick()

  expect(reload).toHaveBeenCalledWith({ only: ['catalogModels'], data: { brandId: 1 } })
})

test('ne propose aucun modèle tant qu’aucune marque du catalogue n’est retenue', () => {
  const w = mountFields({ catalogModels: MODELS })

  expect(comboboxes(w)[1].props('options')).toEqual([])
})

test('propose les modèles de la marque rapprochée par le serveur', () => {
  const w = mountFields({
    manufacturer: 'Bénéteau',
    catalogBrandId: 1,
    catalogModels: MODELS,
  })
  const modelOptions = comboboxes(w)[1].props('options') as Array<{ label: string }>

  expect(modelOptions.map((o) => o.label)).toEqual(['Oceanis 46.1'])
})

test('retaper le constructeur invalide les modèles de la marque précédente', async () => {
  const w = mountFields({
    manufacturer: 'Bénéteau',
    catalogBrandId: 1,
    catalogModels: MODELS,
  })
  expect(comboboxes(w)[1].props('options')).toHaveLength(1)

  await w.setProps({ manufacturer: 'Chantier de mon oncle' })

  expect(comboboxes(w)[1].props('options')).toEqual([])
})

test('une saisie libre remonte telle quelle au formulaire', async () => {
  const w = mountFields()

  await w.find('input[name="manufacturer"]').setValue('Chantier de mon oncle')

  expect(w.emitted('update:manufacturer')?.at(-1)).toEqual(['Chantier de mon oncle'])
  expect(reload).not.toHaveBeenCalled()
})
