import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import { computed, ref } from 'vue'
import type { SailLoftOption } from '../../shared/types/sail_loft'

const lofts = ref<SailLoftOption[]>([])
const catalogLoftId = ref<number | null>(null)

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

vi.mock('~/composables/use_sail_lofts', () => ({
  useSailLofts: () => ({
    lofts: computed(() => lofts.value),
    catalogLoftId: computed(() => catalogLoftId.value),
  }),
}))

import BaseCombobox from '../../inertia/components/base/BaseCombobox.vue'
import BoatEquipmentSailFields from '../../inertia/components/boats/sail/BoatEquipmentSailFields.vue'
import type { BoatEquipmentSailFieldsModel } from '../../inertia/components/boats/sail/BoatEquipmentSailFields.vue'
import { SAIL_MATERIALS } from '../../shared/types/boat'

const LOFTS: SailLoftOption[] = [
  {
    id: 1,
    slug: 'incidence-sails',
    name: 'Incidence Sails',
    country: 'FR',
    aliases: ['incidence'],
  },
  { id: 2, slug: 'north-sails', name: 'North Sails', country: 'US', aliases: ['north'] },
]

function mountFields(props: Record<string, unknown> = {}, pageLofts: SailLoftOption[] = LOFTS) {
  lofts.value = pageLofts
  catalogLoftId.value = null
  return mount(BoatEquipmentSailFields, {
    props: { errors: {}, ...props },
  })
}

test('le matériau est un select fermé sur le vocabulaire, avec option vide', () => {
  const wrapper = mountFields()
  const select = wrapper.find('select[name="material"]')

  expect(select.exists()).toBe(true)
  const values = wrapper
    .findAll('select[name="material"] option')
    .map((option) => option.attributes('value'))
  // L'option vide (`allow-empty`) permet de répondre « je ne sais pas ».
  expect(values).toEqual(['', ...SAIL_MATERIALS])
})

test('plus aucun label en dur — Material et Area (m²) passent par t()', () => {
  const wrapper = mountFields()
  const labels = wrapper.findAll('label').map((label) => label.text())

  // `t` est mocké en identité : un label resté en dur trahirait sa chaîne brute.
  expect(labels).not.toContain('Material')
  expect(labels).not.toContain('Area (m²)')
  expect(labels).toContain('boats.sailFields.material')
  expect(labels).toContain('boats.sailFields.areaM2')
})

test('la voilerie est une combobox nourrie par la prop de page sailLofts', () => {
  const wrapper = mountFields()
  const combobox = wrapper.findComponent(BaseCombobox)

  expect(combobox.exists()).toBe(true)
  const options = combobox.props('options') as Array<{ label: string; keywords?: string[] }>
  expect(options.map((option) => option.label)).toEqual(['Incidence Sails', 'North Sails'])
  // Les alias rendent la recherche aussi tolérante que `resolveLoft` côté serveur.
  expect(options[0].keywords).toEqual(['incidence'])

  // Champ natif : c'est le `<Form>` Inertia de la page qui sérialise.
  expect(wrapper.find('input[name="sailmaker"]').exists()).toBe(true)
  expect(wrapper.find('input[type="hidden"][name="sailLoftId"]').exists()).toBe(true)
})

test('retenir une voilerie pose le rattachement, la retaper le relâche', async () => {
  const wrapper = mountFields()

  wrapper.findComponent(BaseCombobox).vm.$emit('select', { value: '2', label: 'North Sails' })
  await wrapper.vm.$nextTick()
  expect(wrapper.find('input[name="sailLoftId"]').attributes('value')).toBe('2')

  // La saisie hors référentiel reste acceptée telle quelle : seul le
  // rattachement tombe, jamais le texte.
  await wrapper.find('input[name="sailmaker"]').setValue('Voilerie du port')
  expect(wrapper.find('input[name="sailLoftId"]').attributes('value')).toBe('')
})

test('une voile existante préremplit voilerie, rattachement et matériau', async () => {
  const sail: BoatEquipmentSailFieldsModel = {
    id: 7,
    sailType: 'genoa',
    manufacturedAt: null,
    areaM2: 42,
    material: 'laminate',
    reefPoints: null,
    status: 'operational',
    notes: null,
    purchasePrice: null,
    purchasedAt: null,
    sailmaker: 'North Sails',
    sailLoftId: 2,
  }
  const wrapper = mountFields({ sail })
  await wrapper.vm.$nextTick()

  expect((wrapper.find('input[name="sailmaker"]').element as HTMLInputElement).value).toBe(
    'North Sails'
  )
  expect(wrapper.find('input[name="sailLoftId"]').attributes('value')).toBe('2')
  expect((wrapper.find('select[name="material"]').element as HTMLSelectElement).value).toBe(
    'laminate'
  )
})
