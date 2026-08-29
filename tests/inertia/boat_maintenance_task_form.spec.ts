import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

vi.mock('@adonisjs/inertia/vue', () => ({
  Form: {
    name: 'Form',
    props: { action: { type: Object, required: false } },
    template: '<form><slot :processing="false" :errors="{}" /></form>',
  },
}))

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key, locale: { value: 'fr' } }),
}))

import BaseCombobox from '../../inertia/components/base/BaseCombobox.vue'
import BoatMaintenanceTaskForm from '../../inertia/components/boats/maintenance/BoatMaintenanceTaskForm.vue'
import { MAINTENANCE_OPERATION_INDEX } from '../../shared/constants/maintenance/maintenance_operations'

function boat(engines: Array<{ kind: string; fuel: string | null }> = []) {
  return {
    id: 7,
    name: 'Bel Ami',
    rig: null,
    sails: [],
    engines: engines.map((engine, index) => ({
      id: index + 1,
      brand: 'Volvo',
      model: 'D2-40',
      ...engine,
    })),
  }
}

function mountForm(engines: Array<{ kind: string; fuel: string | null }> = []) {
  return mount(BoatMaintenanceTaskForm, {
    props: { boat: boat(engines) as never },
  })
}

/** Retient une option du catalogue comme le ferait un clic dans la liste. */
async function selectOperation(w: ReturnType<typeof mountForm>, key: string) {
  const combobox = w.findComponent(BaseCombobox)
  const option = combobox.props('options').find((o) => o.value === key)
  expect(option, `option absente du catalogue : ${key}`).toBeTruthy()
  combobox.vm.$emit('update:modelValue', option!.label)
  combobox.vm.$emit('select', option!)
  await w.vm.$nextTick()
  return option!
}

test('le titre est une combobox alimentée par le catalogue', () => {
  const w = mountForm()

  const combobox = w.findComponent(BaseCombobox)
  expect(combobox.exists()).toBe(true)
  // Le champ reste un champ de formulaire natif, sérialisé par le <Form> Inertia.
  expect(w.find('input[name="title"]').exists()).toBe(true)
  expect(combobox.props('options').length).toBeGreaterThanOrEqual(60)
})

test('retenir une opération remplit le titre, le sujet et les intervalles', async () => {
  const w = mountForm([{ kind: 'inboard', fuel: 'diesel' }])

  const option = await selectOperation(w, 'engine.oil_change')
  const operation = MAINTENANCE_OPERATION_INDEX.get('engine.oil_change')!

  expect(w.find('input[name="title"]').attributes('value')).toBe(option.label)
  expect((w.find('select[name="subject"]').element as HTMLSelectElement).value).toBe('engine')
  expect((w.find('input[name="recurrenceIntervalMonths"]').element as HTMLInputElement).value).toBe(
    String(operation.defaultIntervalMonths)
  )
  expect(
    (w.find('input[name="recurrenceIntervalEngineHours"]').element as HTMLInputElement).value
  ).toBe(String(operation.defaultIntervalEngineHours))
})

test('le pré-remplissage n’écrase jamais un intervalle déjà saisi', async () => {
  const w = mountForm([{ kind: 'inboard', fuel: 'diesel' }])

  const months = w.find('input[name="recurrenceIntervalMonths"]')
  await months.setValue('6')
  await selectOperation(w, 'engine.oil_change')

  expect((w.find('input[name="recurrenceIntervalMonths"]').element as HTMLInputElement).value).toBe(
    '6'
  )
})

test("les heures moteur ne sont pré-remplies qu'une fois le moteur connu", async () => {
  // Deux moteurs : rien à retenir d'office, donc pas d'heures pré-remplies —
  // le service rejetterait une récurrence en heures sans `boatEngineId`.
  const w = mountForm([
    { kind: 'inboard', fuel: 'diesel' },
    { kind: 'inboard', fuel: 'diesel' },
  ])

  await selectOperation(w, 'engine.oil_change')
  const hours = () =>
    (w.find('input[name="recurrenceIntervalEngineHours"]').element as HTMLInputElement).value

  expect(w.find('select[name="boatEngineId"]').element).toBeTruthy()
  expect((w.find('select[name="boatEngineId"]').element as HTMLSelectElement).value).toBe('')
  expect(hours()).toBe('')

  // Le moteur retenu après coup débloque le pré-remplissage…
  await w.find('select[name="boatEngineId"]').setValue('1')
  expect(hours()).toBe(
    String(MAINTENANCE_OPERATION_INDEX.get('engine.oil_change')!.defaultIntervalEngineHours)
  )

  // …et le désélectionner reprend ce que le catalogue avait posé.
  await w.find('select[name="boatEngineId"]').setValue('')
  expect(hours()).toBe('')
})

test('un moteur unique est retenu d’office par une opération moteur', async () => {
  const w = mountForm([{ kind: 'inboard', fuel: 'diesel' }])

  await selectOperation(w, 'engine.oil_change')

  expect((w.find('select[name="boatEngineId"]').element as HTMLSelectElement).value).toBe('1')
})

test('la saisie libre reste acceptée telle quelle', async () => {
  const w = mountForm()

  await w.find('input[name="title"]').setValue('Réparation maison du davier')

  expect((w.find('input[name="title"]').element as HTMLInputElement).value).toBe(
    'Réparation maison du davier'
  )
  expect((w.find('select[name="subject"]').element as HTMLSelectElement).value).toBe('boat')
})

test('les opérations essence ne sont pas proposées sur un bateau au diesel', () => {
  const w = mountForm([{ kind: 'inboard', fuel: 'diesel' }])

  const keys = w
    .findComponent(BaseCombobox)
    .props('options')
    .map((o) => o.value)
  expect(keys).toContain('engine.oil_change')
  expect(keys).not.toContain('engine.spark_plugs')
})

test('les 10 sujets sont sélectionnables, comme le validator les accepte', () => {
  const w = mountForm()

  const values = w.findAll('select[name="subject"] option').map((o) => o.attributes('value'))
  expect(values).toEqual([
    'boat',
    'hull',
    'engine',
    'sail',
    'rig',
    'electrical',
    'plumbing',
    'safety',
    'deck',
    'other',
  ])
})
