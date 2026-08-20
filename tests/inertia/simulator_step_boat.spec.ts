import { mount } from '@vue/test-utils'
import { describe, test, expect, vi } from 'vitest'
import SimulatorStepBoat from '../../inertia/components/marketing/simulator/SimulatorStepBoat.vue'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

test('renders the four boat type buttons with an accessible name each', () => {
  const w = mount(SimulatorStepBoat, { props: { modelValue: {} } })
  const labels = w
    .findAll('button[aria-label^="simulator.boat_type_"]')
    .map((b) => b.attributes('aria-label'))
  expect(labels).toEqual([
    'simulator.boat_type_motorboat',
    'simulator.boat_type_sailboat',
    'simulator.boat_type_catamaran',
    'simulator.boat_type_rib',
  ])
})

test('CE navigation categories expose their full label as aria-label', () => {
  const w = mount(SimulatorStepBoat, { props: { modelValue: {} } })
  const labels = w
    .findAll('button[aria-label^="simulator.nav_category_"]')
    .map((b) => b.attributes('aria-label'))
  expect(labels).toEqual([
    'simulator.nav_category_a',
    'simulator.nav_category_b',
    'simulator.nav_category_c',
    'simulator.nav_category_d',
  ])
})

test('decorative boat type emoji is hidden from assistive tech', () => {
  const w = mount(SimulatorStepBoat, { props: { modelValue: {} } })
  const emoji = w.find(
    'button[aria-label="simulator.boat_type_motorboat"] span[aria-hidden="true"]'
  )
  expect(emoji.exists()).toBe(true)
})

test('emits the boat type on selection', async () => {
  const w = mount(SimulatorStepBoat, { props: { modelValue: {} } })
  await w.find('button[aria-label="simulator.boat_type_sailboat"]').trigger('click')
  const emitted = w.emitted('update:modelValue')
  expect(emitted).toBeTruthy()
  expect(emitted![0][0]).toMatchObject({ boatType: 'sailboat' })
})

// Regression: browser autofill sets lengthM then yearBuilt within the same tick,
// before props.modelValue propagates back. The two fields must merge, not clobber.
test('merges two fields updated in the same tick without losing the first', async () => {
  const w = mount(SimulatorStepBoat, { props: { modelValue: {} } })

  await w.find('#lengthM').setValue('10')
  await w.find('#yearBuilt').setValue('2005')

  const emitted = w.emitted('update:modelValue')!
  const last = emitted[emitted.length - 1][0]
  expect(last).toMatchObject({ lengthM: 10, yearBuilt: 2005 })
})

test('resyncs local state when the parent replaces modelValue (restart)', async () => {
  const w = mount(SimulatorStepBoat, {
    props: { modelValue: { lengthM: 12, boatType: 'sailboat' } },
  })

  await w.setProps({ modelValue: { hasDedicatedEngine: true } })
  await w.find('#lengthM').setValue('7')

  const emitted = w.emitted('update:modelValue')!
  const last = emitted[emitted.length - 1][0]
  expect(last).toEqual({ hasDedicatedEngine: true, lengthM: 7 })
})

// #464: « 10.5 » tapé au pavé numérique laissait « 5 » dans le champ. Le champ
// renvoyait `Number(value)` dans `:value`, or « 10. » est incomplet donc lu
// comme vide : le `0` réinjecté écrasait la frappe en cours.
describe('length input (#464)', () => {
  // Rejoue le va-et-vient du parent : `v-model` renvoie chaque émission dans
  // les props, c'est là que la valeur réinjectée écrasait la saisie.
  function mountWithParent(modelValue: Record<string, unknown> = {}) {
    const w = mount(SimulatorStepBoat, { props: { modelValue } })
    const sync = async () => {
      const emitted = w.emitted('update:modelValue')!
      await w.setProps({ modelValue: emitted[emitted.length - 1][0] as Record<string, unknown> })
    }
    const last = () => {
      const emitted = w.emitted('update:modelValue')!
      return emitted[emitted.length - 1][0] as Record<string, unknown>
    }
    return { w, sync, last }
  }

  test('accepts the decimal point', async () => {
    const { w, sync, last } = mountWithParent()
    await w.find('#lengthM').setValue('10.5')
    await sync()
    expect(last()).toMatchObject({ lengthM: 10.5 })
    expect((w.find('#lengthM').element as HTMLInputElement).value).toBe('10.5')
  })

  test('accepts the decimal comma', async () => {
    const { w, sync, last } = mountWithParent()
    await w.find('#lengthM').setValue('10,5')
    await sync()
    expect(last()).toMatchObject({ lengthM: 10.5 })
  })

  test('leaves an in-progress entry alone instead of writing a 0 back', async () => {
    // Un champ `type="number"` rapporte une valeur vide tant que « 10. » est
    // incomplet : le composant doit s'abstenir, pas renvoyer `Number('') === 0`.
    const { w, sync, last } = mountWithParent()
    const input = w.find('#lengthM')

    await input.setValue('')
    await sync()

    expect(last().lengthM).toBeUndefined()
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  test('clearing the field does not leave a 0 behind', async () => {
    const { w, sync, last } = mountWithParent()
    await w.find('#lengthM').setValue('10.5')
    await sync()
    await w.find('#lengthM').setValue('')
    await sync()

    expect(last().lengthM).toBeUndefined()
    expect((w.find('#lengthM').element as HTMLInputElement).value).toBe('')
  })

  test('flags an out-of-range length instead of silently disabling Next', async () => {
    const w = mount(SimulatorStepBoat, { props: { modelValue: {} } })
    await w.find('#lengthM').setValue('42')

    const error = w.find('#lengthM-error')
    expect(error.exists()).toBe(true)
    expect(error.text()).toBe('simulator.length_error')
    expect(w.find('#lengthM').attributes('aria-invalid')).toBe('true')
    expect(w.find('#lengthM').attributes('aria-describedby')).toBe('lengthM-error')
  })

  test('flags an out-of-range year the same way', async () => {
    const w = mount(SimulatorStepBoat, { props: { modelValue: {} } })
    await w.find('#yearBuilt').setValue('1899')

    expect(w.find('#yearBuilt-error').exists()).toBe(true)
    expect(w.find('#yearBuilt').attributes('aria-invalid')).toBe('true')
  })

  test('stays quiet on an empty or valid field', async () => {
    const w = mount(SimulatorStepBoat, { props: { modelValue: {} } })
    expect(w.find('#lengthM-error').exists()).toBe(false)

    await w.find('#lengthM').setValue('10.5')
    expect(w.find('#lengthM-error').exists()).toBe(false)
    expect(w.find('#lengthM').attributes('aria-invalid')).toBeUndefined()
  })
})

describe('dark mode (#416)', () => {
  test('les cartes d’option utilisent des tokens, pas bg-white ni navy figé', () => {
    const html = mount(SimulatorStepBoat, { props: { modelValue: {} } }).html()
    expect(html).toContain('bg-surface-elevated')
    // `border-bone` compte : c'est l'un des quatre neutres chauds remappés en
    // encre froide par `[data-theme='dark']`, au même titre que `border-border`.
    expect(html).toMatch(/border-(bone|border)\b/)
    expect(html).not.toContain('bg-white')
    // `bg-navy-50 text-navy-700` restait un aplat clair sur une page sombre.
    expect(html).not.toMatch(/bg-navy-(50|100)\b/)
  })

  test('l’état sélectionné passe par brand-soft / brand', () => {
    const html = mount(SimulatorStepBoat, {
      props: { modelValue: { boatType: 'sailboat' } },
    }).html()
    expect(html).toContain('bg-brand-soft')
    expect(html).toContain('text-brand')
  })
})
