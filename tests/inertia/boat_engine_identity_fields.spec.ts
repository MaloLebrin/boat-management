import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'

const reload = vi.fn()

vi.mock('@inertiajs/vue3', () => ({
  router: { reload: (...args: unknown[]) => reload(...args) },
}))

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

import BaseCombobox from '../../inertia/components/base/BaseCombobox.vue'
import BoatEngineIdentityFields from '../../inertia/components/boats/engine/BoatEngineIdentityFields.vue'
import type { EngineBrandOption, EngineModelOption } from '../../shared/types/engine_catalog'

const BRANDS: EngineBrandOption[] = [
  {
    id: 1,
    slug: 'volvo-penta',
    name: 'Volvo Penta',
    country: 'SE',
    families: ['inboard_diesel', 'inboard_petrol'],
    aliases: ['volvo', 'VP'],
  },
  {
    id: 2,
    slug: 'yamaha',
    name: 'Yamaha',
    country: 'JP',
    families: ['outboard_thermal'],
    aliases: [],
  },
]

const MODELS: EngineModelOption[] = [
  {
    id: 10,
    slug: 'd2-40',
    name: 'D2-40',
    modelCode: 'D2-40',
    family: 'inboard_diesel',
    powerHp: 40,
    strokeType: null,
    fuel: 'diesel',
    productionStartYear: null,
    productionEndYear: null,
  },
]

function mountFields(props: Record<string, unknown> = {}) {
  reload.mockClear()
  return mount(BoatEngineIdentityFields, {
    props: {
      brand: '',
      model: '',
      errors: {},
      brands: BRANDS,
      catalogModels: [],
      catalogBrandId: null,
      engineModelId: null,
      ...props,
    },
  })
}

function comboboxes(wrapper: ReturnType<typeof mountFields>) {
  return wrapper.findAllComponents(BaseCombobox)
}

test('rend marque et modèle en champs de formulaire natifs', () => {
  const wrapper = mountFields()

  // C'est un `<Form>` Inertia qui sérialise la page : les champs doivent rester
  // de vrais `input[name]`, sinon rien ne part au serveur.
  expect(wrapper.find('input[name="brand"]').exists()).toBe(true)
  expect(wrapper.find('input[name="model"]').exists()).toBe(true)
  expect(wrapper.find('input[type="hidden"][name="engineModelId"]').exists()).toBe(true)
})

test('propose toutes les marques du catalogue avec leur famille en indice', () => {
  const wrapper = mountFields()
  const options = comboboxes(wrapper)[0].props('options') as Array<{ label: string; hint?: string }>

  expect(options.map((o) => o.label)).toEqual(['Volvo Penta', 'Yamaha'])
  expect(options[0].hint).toContain('boats.options.engineCatalogFamily.inboard_diesel')
})

test('les alias du catalogue rendent la marque trouvable sous ses autres noms', () => {
  const wrapper = mountFields()
  const options = comboboxes(wrapper)[0].props('options') as Array<{ keywords?: string[] }>

  // Sans eux, une marque absorbée (Mariner sous Mercury, Evinrude sous Johnson)
  // reste introuvable dans la liste alors que le serveur sait la rapprocher.
  expect(options[0].keywords).toEqual(['volvo', 'VP'])
})

test('choisir une marque recharge les modèles par visite Inertia partielle', async () => {
  const wrapper = mountFields()

  comboboxes(wrapper)[0].vm.$emit('select', { value: '1', label: 'Volvo Penta' })
  await wrapper.vm.$nextTick()

  // `engineCatalogBrandId` fait partie du rechargement : la visite remonte
  // l'arbre, c'est le serveur qui réapprend au formulaire la marque retenue.
  expect(reload).toHaveBeenCalledWith({
    only: ['engineCatalogModels', 'engineCatalogBrandId'],
    data: { engineBrandId: 1 },
    preserveScroll: true,
  })
})

test('ne propose aucun modèle tant qu’aucune marque du catalogue n’est retenue', () => {
  const wrapper = mountFields({ catalogModels: MODELS })

  expect(comboboxes(wrapper)[1].props('options')).toEqual([])
})

test('propose les modèles de la marque rapprochée par le serveur', () => {
  const wrapper = mountFields({
    brand: 'Volvo Penta',
    catalogBrandId: 1,
    catalogModels: MODELS,
  })
  const options = comboboxes(wrapper)[1].props('options') as Array<{ label: string; hint?: string }>

  expect(options.map((o) => o.label)).toEqual(['D2-40'])
  expect(options[0].hint).toContain('boats.engines.catalog.powerHint')
})

test('retenir un modèle remonte la fiche catalogue et pose le rattachement', async () => {
  const wrapper = mountFields({ brand: 'Volvo Penta', catalogBrandId: 1, catalogModels: MODELS })

  comboboxes(wrapper)[1].vm.$emit('select', { value: '10', label: 'D2-40' })
  await wrapper.vm.$nextTick()

  expect(wrapper.emitted('select-model')?.at(-1)).toEqual([MODELS[0]])
  expect(wrapper.find('input[name="engineModelId"]').attributes('value')).toBe('10')
})

test('retaper la marque invalide les modèles et le rattachement', async () => {
  const wrapper = mountFields({ brand: 'Volvo Penta', catalogBrandId: 1, catalogModels: MODELS })

  comboboxes(wrapper)[1].vm.$emit('select', { value: '10', label: 'D2-40' })
  await wrapper.setProps({ brand: 'Chantier de mon oncle' })

  expect(comboboxes(wrapper)[1].props('options')).toEqual([])
  expect(wrapper.find('input[name="engineModelId"]').attributes('value')).toBe('')
})

test('retaper le modèle relâche le rattachement, la saisie reste acceptée', async () => {
  const wrapper = mountFields({ brand: 'Volvo Penta', catalogBrandId: 1, catalogModels: MODELS })

  comboboxes(wrapper)[1].vm.$emit('select', { value: '10', label: 'D2-40' })
  await wrapper.setProps({ model: 'D2-40 revisité' })

  expect(wrapper.find('input[name="engineModelId"]').attributes('value')).toBe('')
})

test('une saisie hors catalogue remonte telle quelle et ne déclenche aucune visite', async () => {
  const wrapper = mountFields()

  await wrapper.find('input[name="brand"]').setValue('Moteur de mon oncle')

  expect(wrapper.emitted('update:brand')?.at(-1)).toEqual(['Moteur de mon oncle'])
  expect(reload).not.toHaveBeenCalled()
})

test('sans type de moteur renseigné, la liste garde son ordre alphabétique sans sections', () => {
  const wrapper = mountFields()
  const options = comboboxes(wrapper)[0].props('options') as Array<{
    label: string
    group?: string
  }>

  expect(options.map((o) => o.label)).toEqual(['Volvo Penta', 'Yamaha'])
  expect(options.every((o) => o.group === undefined)).toBe(true)
})

test('le type de moteur fait remonter les marques de sa famille en tête (#597)', () => {
  const wrapper = mountFields({ catalogFamilies: ['outboard_thermal'] })
  const options = comboboxes(wrapper)[0].props('options') as Array<{
    label: string
    group?: string
  }>

  // La liste est tronquée à cinquante suggestions : sans cette remontée, un
  // motoriste hors-bord en fin d'alphabet pouvait ne jamais s'afficher.
  expect(options.map((o) => o.label)).toEqual(['Yamaha', 'Volvo Penta'])
  expect(options[0].group).toBe('boats.engines.catalog.brandGroupForEngineType')
})

test('les marques hors du type restent proposées, sous « autres marques »', () => {
  const wrapper = mountFields({ catalogFamilies: ['outboard_thermal'] })
  const options = comboboxes(wrapper)[0].props('options') as Array<{
    label: string
    group?: string
  }>

  // La famille priorise, elle ne filtre jamais : un moteur d'occasion hors
  // corpus, ou une marque mal classée, doit rester atteignable.
  expect(options).toHaveLength(BRANDS.length)
  expect(options[1]).toMatchObject({
    label: 'Volvo Penta',
    group: 'boats.engines.catalog.brandGroupOther',
  })
})

test('une marque multi-familles remonte dès qu’une seule famille correspond', () => {
  const wrapper = mountFields({ catalogFamilies: ['inboard_petrol'] })
  const options = comboboxes(wrapper)[0].props('options') as Array<{ label: string }>

  // Volvo Penta couvre `inboard_diesel` et `inboard_petrol`.
  expect(options[0].label).toBe('Volvo Penta')
})

test('la priorisation conserve les alias, la marque reste trouvable sous ses autres noms', () => {
  const wrapper = mountFields({ catalogFamilies: ['outboard_thermal'] })
  const options = comboboxes(wrapper)[0].props('options') as Array<{
    label: string
    keywords?: string[]
    hint?: string
  }>
  const volvo = options.find((o) => o.label === 'Volvo Penta')

  expect(volvo?.keywords).toEqual(['volvo', 'VP'])
  expect(volvo?.hint).toContain('boats.options.engineCatalogFamily.inboard_diesel')
})
