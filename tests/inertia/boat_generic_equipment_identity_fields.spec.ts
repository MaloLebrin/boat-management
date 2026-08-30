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
import BoatGenericEquipmentIdentityFields from '../../inertia/components/boats/equipment/BoatGenericEquipmentIdentityFields.vue'
import type {
  EquipmentBrandOption,
  EquipmentModelOption,
} from '../../shared/types/equipment_catalog'

const BRANDS: EquipmentBrandOption[] = [
  {
    id: 1,
    slug: 'dometic',
    name: 'Dometic',
    country: 'SE',
    categories: ['comfort'],
    aliases: ['waeco'],
  },
  {
    id: 2,
    slug: 'garmin',
    name: 'Garmin',
    country: 'US',
    categories: ['navigation'],
    aliases: [],
  },
]

const MODELS: EquipmentModelOption[] = [
  {
    id: 10,
    slug: 'gpsmap-923',
    name: 'GPSMAP 923',
    category: 'navigation',
    productionStartYear: null,
    productionEndYear: null,
  },
]

function mountFields(props: Record<string, unknown> = {}) {
  reload.mockClear()
  return mount(BoatGenericEquipmentIdentityFields, {
    props: {
      brand: '',
      model: '',
      errors: {},
      brands: BRANDS,
      catalogModels: [],
      catalogBrandId: null,
      equipmentModelId: null,
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
  expect(wrapper.find('input[type="hidden"][name="equipmentModelId"]').exists()).toBe(true)
})

test('propose toutes les marques du catalogue avec leurs catégories en indice', () => {
  const wrapper = mountFields()
  const options = comboboxes(wrapper)[0].props('options') as Array<{ label: string; hint?: string }>

  expect(options.map((o) => o.label)).toEqual(['Dometic', 'Garmin'])
  expect(options[0].hint).toContain('boats.options.genericEquipmentCategory.comfort')
})

test('les alias du catalogue rendent la marque trouvable sous ses autres noms', () => {
  const wrapper = mountFields()
  const options = comboboxes(wrapper)[0].props('options') as Array<{ keywords?: string[] }>

  // Sans eux, une marque absorbée (Waeco sous Dometic) reste introuvable dans
  // la liste alors que le serveur sait la rapprocher.
  expect(options[0].keywords).toEqual(['waeco'])
})

test('choisir une marque recharge les modèles par visite Inertia partielle', async () => {
  const wrapper = mountFields()

  comboboxes(wrapper)[0].vm.$emit('select', { value: '2', label: 'Garmin' })
  await wrapper.vm.$nextTick()

  // `equipmentCatalogBrandId` fait partie du rechargement : la visite remonte
  // l'arbre, c'est le serveur qui réapprend au formulaire la marque retenue.
  expect(reload).toHaveBeenCalledWith({
    only: ['equipmentCatalogModels', 'equipmentCatalogBrandId'],
    data: { equipmentBrandId: 2 },
    preserveScroll: true,
  })
})

test('la surface d’origine voyage dans l’URL pour rouvrir la modale', async () => {
  const wrapper = mountFields({ surface: 'generic-card' })

  comboboxes(wrapper)[0].vm.$emit('select', { value: '2', label: 'Garmin' })
  await wrapper.vm.$nextTick()

  expect(reload).toHaveBeenCalledWith({
    only: ['equipmentCatalogModels', 'equipmentCatalogBrandId'],
    data: { equipmentBrandId: 2, equipmentForm: 'generic-card' },
    preserveScroll: true,
  })
})

test('ne propose aucun modèle tant qu’aucune marque du catalogue n’est retenue', () => {
  const wrapper = mountFields({ catalogModels: MODELS })

  expect(comboboxes(wrapper)[1].props('options')).toEqual([])
})

test('propose les modèles de la marque rapprochée par le serveur', () => {
  const wrapper = mountFields({
    brand: 'Garmin',
    catalogBrandId: 2,
    catalogModels: MODELS,
  })
  const options = comboboxes(wrapper)[1].props('options') as Array<{ label: string }>

  expect(options.map((o) => o.label)).toEqual(['GPSMAP 923'])
})

test('retenir un modèle pose le rattachement', async () => {
  const wrapper = mountFields({ brand: 'Garmin', catalogBrandId: 2, catalogModels: MODELS })

  comboboxes(wrapper)[1].vm.$emit('select', { value: '10', label: 'GPSMAP 923' })
  await wrapper.vm.$nextTick()

  expect(wrapper.find('input[name="equipmentModelId"]').attributes('value')).toBe('10')
})

test('retaper la marque invalide les modèles et le rattachement', async () => {
  const wrapper = mountFields({ brand: 'Garmin', catalogBrandId: 2, catalogModels: MODELS })

  comboboxes(wrapper)[1].vm.$emit('select', { value: '10', label: 'GPSMAP 923' })
  await wrapper.setProps({ brand: 'Bricolage de mon oncle' })

  expect(comboboxes(wrapper)[1].props('options')).toEqual([])
  expect(wrapper.find('input[name="equipmentModelId"]').attributes('value')).toBe('')
})

test('retaper le modèle relâche le rattachement, la saisie reste acceptée', async () => {
  const wrapper = mountFields({ brand: 'Garmin', catalogBrandId: 2, catalogModels: MODELS })

  comboboxes(wrapper)[1].vm.$emit('select', { value: '10', label: 'GPSMAP 923' })
  await wrapper.setProps({ model: 'GPSMAP 923 modifié' })

  expect(wrapper.find('input[name="equipmentModelId"]').attributes('value')).toBe('')
})

test('une saisie hors catalogue remonte telle quelle et ne déclenche aucune visite', async () => {
  const wrapper = mountFields()

  await wrapper.find('input[name="brand"]').setValue('Bricolage de mon oncle')

  expect(wrapper.emitted('update:brand')?.at(-1)).toEqual(['Bricolage de mon oncle'])
  expect(reload).not.toHaveBeenCalled()
})

test('sans catégorie renseignée, la liste garde son ordre alphabétique sans sections', () => {
  const wrapper = mountFields()
  const options = comboboxes(wrapper)[0].props('options') as Array<{
    label: string
    group?: string
  }>

  expect(options.map((o) => o.label)).toEqual(['Dometic', 'Garmin'])
  expect(options.every((o) => o.group === undefined)).toBe(true)
})

test('la catégorie de l’équipement fait remonter ses marques en tête', () => {
  const wrapper = mountFields({ category: 'navigation' })
  const options = comboboxes(wrapper)[0].props('options') as Array<{
    label: string
    group?: string
  }>

  // Sans cette remontée, une marque hors du début de l'alphabet resterait
  // noyée dans une liste de plus de cent entrées.
  expect(options.map((o) => o.label)).toEqual(['Garmin', 'Dometic'])
  expect(options[0].group).toBe('boats.genericEquipment.catalog.brandGroupForCategory')
  expect(options[1].group).toBe('boats.genericEquipment.catalog.brandGroupOther')
})
