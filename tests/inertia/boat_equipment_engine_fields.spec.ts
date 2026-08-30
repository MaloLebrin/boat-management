import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { test, expect, vi } from 'vitest'

const pageProps: Record<string, unknown> = {}

vi.mock('@inertiajs/vue3', () => ({
  router: { reload: vi.fn() },
  usePage: () => ({ props: pageProps }),
  // Le brouillon de saisie a son propre spec (`use_engine_form_draft.spec.ts`) :
  // ici on veut juste un magasin inerte, pour ne tester que le formulaire.
  useRemember: (data: unknown) => ref(data),
}))

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

import BaseCombobox from '../../inertia/components/base/BaseCombobox.vue'
import BoatEquipmentEngineFields from '../../inertia/components/boats/engine/BoatEquipmentEngineFields.vue'
import type { EngineBrandOption, EngineModelOption } from '../../shared/types/engine_catalog'

const BRANDS: EngineBrandOption[] = [
  {
    id: 1,
    slug: 'volvo-penta',
    name: 'Volvo Penta',
    country: 'SE',
    families: ['inboard_diesel'],
    aliases: ['volvo', 'VP'],
  },
]

const D2_40: EngineModelOption = {
  id: 10,
  slug: 'd2-40',
  name: 'D2-40',
  modelCode: 'D2-40',
  family: 'inboard_diesel',
  powerHp: 40,
  strokeType: '4_stroke',
  fuel: 'diesel',
  productionStartYear: null,
  productionEndYear: null,
}

function mountFields(engine: Record<string, unknown> | null = null) {
  Object.assign(pageProps, {
    engineBrands: BRANDS,
    engineCatalogModels: [D2_40],
    engineCatalogBrandId: 1,
  })
  return mount(BoatEquipmentEngineFields, { props: { errors: {}, engine: engine as never } })
}

/** Retient `D2-40` dans la combobox modèle, comme le ferait l'utilisateur. */
async function selectCatalogModel(wrapper: ReturnType<typeof mountFields>) {
  const modelCombobox = wrapper
    .findAllComponents(BaseCombobox)
    .find((c) => c.props('name') === 'model')
  modelCombobox!.vm.$emit('select', { value: String(D2_40.id), label: D2_40.name })
  await wrapper.vm.$nextTick()
}

function value(wrapper: ReturnType<typeof mountFields>, selector: string) {
  return (wrapper.find(selector).element as HTMLInputElement | HTMLSelectElement).value
}

test('le catalogue de la page alimente la combobox marque', () => {
  const wrapper = mountFields()
  const brandCombobox = wrapper
    .findAllComponents(BaseCombobox)
    .find((c) => c.props('name') === 'brand')

  expect((brandCombobox!.props('options') as Array<{ label: string }>).map((o) => o.label)).toEqual(
    ['Volvo Penta']
  )
})

test('retenir un modèle pré-remplit les champs restés vides', async () => {
  const wrapper = mountFields()

  await selectCatalogModel(wrapper)

  expect(value(wrapper, 'input[name="powerHp"]')).toBe('40')
  expect(value(wrapper, 'select[name="fuel"]')).toBe('diesel')
  expect(value(wrapper, 'select[name="strokeType"]')).toBe('4_stroke')
  // Le catalogue classe des gammes : il propose la transmission la plus
  // courante d'un diesel, la ligne d'arbre (#574).
  expect(value(wrapper, 'select[name="family"]')).toBe('inboard_diesel_shaft')
})

test('le pré-remplissage n’écrase jamais une valeur déjà saisie', async () => {
  // Moteur en édition : l'utilisateur a mesuré 38 ch et connaît son carburant.
  const wrapper = mountFields({
    id: 3,
    kind: 'inboard',
    fuel: 'essence',
    strokeType: '2_stroke',
    family: 'inboard_diesel_saildrive',
    brand: 'Volvo Penta',
    model: '',
    serialNumber: null,
    manufacturedAt: null,
    powerHp: 38,
    hours: 120,
    installHours: 100,
    status: 'operational',
  })

  await selectCatalogModel(wrapper)

  expect(value(wrapper, 'input[name="powerHp"]')).toBe('38')
  expect(value(wrapper, 'select[name="fuel"]')).toBe('essence')
  expect(value(wrapper, 'select[name="strokeType"]')).toBe('2_stroke')
  expect(value(wrapper, 'select[name="family"]')).toBe('inboard_diesel_saildrive')
})

test('la famille reste facultative : « — » est une réponse valide', () => {
  const wrapper = mountFields()

  // Aucune famille présélectionnée à la création : le champ part vide, et la
  // valeur envoyée au serveur est neutralisée en `null` par le validator.
  expect(value(wrapper, 'select[name="family"]')).toBe('')
  const options = wrapper.findAll('select[name="family"] option').map((o) => o.attributes('value'))
  expect(options).toContain('inboard_diesel_saildrive')
  expect(options).toContain('outboard_2t')
})

test('sans catalogue en props de page, le formulaire reste en saisie libre', () => {
  for (const key of ['engineBrands', 'engineCatalogModels', 'engineCatalogBrandId']) {
    delete pageProps[key]
  }
  const wrapper = mount(BoatEquipmentEngineFields, { props: { errors: {}, engine: null } })

  const brandCombobox = wrapper
    .findAllComponents(BaseCombobox)
    .find((c) => c.props('name') === 'brand')
  expect(brandCombobox!.props('options')).toEqual([])
  expect(wrapper.find('input[name="brand"]').exists()).toBe(true)
})
