import { mount } from '@vue/test-utils'
import { test, expect, describe } from 'vitest'
import BaseRadioList from '../../inertia/components/base/BaseRadioList.vue'

const baseOptions = [
  { value: null, label: 'Aucun' },
  { value: 1, label: 'Neptune' },
  { value: 2, label: 'Esperanza', badge: 'Actuel' },
]

describe('BaseRadioList', () => {
  test('renders all options', () => {
    const w = mount(BaseRadioList, {
      props: { name: 'boat', modelValue: null, options: baseOptions },
    })
    const labels = w.findAll('label')
    expect(labels).toHaveLength(3)
    expect(labels[0].text()).toContain('Aucun')
    expect(labels[1].text()).toContain('Neptune')
    expect(labels[2].text()).toContain('Esperanza')
  })

  test('marks selected option as checked', () => {
    const w = mount(BaseRadioList, {
      props: { name: 'boat', modelValue: 1, options: baseOptions },
    })
    const inputs = w.findAll('input[type="radio"]')
    expect((inputs[0].element as HTMLInputElement).checked).toBe(false)
    expect((inputs[1].element as HTMLInputElement).checked).toBe(true)
    expect((inputs[2].element as HTMLInputElement).checked).toBe(false)
  })

  test('marks null option as checked when modelValue is null', () => {
    const w = mount(BaseRadioList, {
      props: { name: 'boat', modelValue: null, options: baseOptions },
    })
    const inputs = w.findAll('input[type="radio"]')
    expect((inputs[0].element as HTMLInputElement).checked).toBe(true)
    expect((inputs[1].element as HTMLInputElement).checked).toBe(false)
  })

  test('emits update:modelValue with number value on selection', async () => {
    const w = mount(BaseRadioList, {
      props: { name: 'boat', modelValue: null, options: baseOptions },
    })
    await w.findAll('input[type="radio"]')[1].trigger('change')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([1])
  })

  test('emits update:modelValue with null when null option selected', async () => {
    const w = mount(BaseRadioList, {
      props: { name: 'boat', modelValue: 1, options: baseOptions },
    })
    await w.findAll('input[type="radio"]')[0].trigger('change')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([null])
  })

  test('emits update:modelValue with string value', async () => {
    const options = [
      { value: null, label: 'None' },
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
    ]
    const w = mount(BaseRadioList, {
      props: { name: 'choice', modelValue: null, options },
    })
    await w.findAll('input[type="radio"]')[2].trigger('change')
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['b'])
  })

  test('shows badge when provided', () => {
    const w = mount(BaseRadioList, {
      props: { name: 'boat', modelValue: null, options: baseOptions },
    })
    const badges = w.findAll('[class*="text-brand"]')
    expect(badges.some((b) => b.text() === 'Actuel')).toBe(true)
  })

  test('does not show badge when not provided', () => {
    const options = [{ value: 1, label: 'Neptune' }]
    const w = mount(BaseRadioList, {
      props: { name: 'boat', modelValue: null, options },
    })
    expect(w.find('[class*="text-brand"]').exists()).toBe(false)
  })

  test('applies active highlight class on selected option', () => {
    const w = mount(BaseRadioList, {
      props: { name: 'boat', modelValue: 2, options: baseOptions },
    })
    const labels = w.findAll('label')
    expect(labels[2].classes()).toContain('bg-brand/5')
    expect(labels[0].classes()).not.toContain('bg-brand/5')
    expect(labels[1].classes()).not.toContain('bg-brand/5')
  })

  test('applies active highlight class on null option when selected', () => {
    const w = mount(BaseRadioList, {
      props: { name: 'boat', modelValue: null, options: baseOptions },
    })
    const labels = w.findAll('label')
    expect(labels[0].classes()).toContain('bg-brand/5')
  })

  test('renders with no options without error', () => {
    const w = mount(BaseRadioList, {
      props: { name: 'boat', modelValue: null, options: [] },
    })
    expect(w.findAll('label')).toHaveLength(0)
  })
})
