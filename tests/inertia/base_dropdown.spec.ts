import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import BaseDropdown from '../../inertia/components/base/BaseDropdown.vue'

test('toggles menu on click', async () => {
  const w = mount(BaseDropdown, {
    slots: {
      trigger: 'Open',
      default: '<div class="menu">Item</div>',
    },
  })
  expect(w.find('.menu').exists()).toBe(false)
  await w.find('button').trigger('click')
  expect(w.find('.menu').exists()).toBe(true)
})

test('variant="primary" applies the brand-colored trigger button (#365)', () => {
  const w = mount(BaseDropdown, {
    props: { variant: 'primary' },
    slots: { trigger: 'Open' },
  })
  expect(w.find('button').classes()).toContain('bg-brand')
})

test('default variant keeps the neutral bordered trigger button', () => {
  const w = mount(BaseDropdown, {
    slots: { trigger: 'Open' },
  })
  expect(w.find('button').classes()).not.toContain('bg-brand')
  expect(w.find('button').classes()).toContain('border')
})

describe('dark mode (#416)', () => {
  test('le déclencheur primary pose text-on-brand, chevron compris', () => {
    const w = mount(BaseDropdown, { props: { variant: 'primary' }, slots: { trigger: 'Open' } })
    const trigger = w.find('button').classes().join(' ')
    expect(trigger).toContain('bg-brand')
    expect(trigger).toContain('text-on-brand')
    // Le chevron est posé sur le même aplat : `text-white/80` y perdait son
    // contraste une fois le brand éclairci en sombre.
    expect(w.find('svg').classes().join(' ')).toContain('text-on-brand/80')
  })

  test('le déclencheur neutre et le panneau utilisent des tokens de surface', async () => {
    const w = mount(BaseDropdown, { slots: { trigger: 'Open', default: '<div class="menu" />' } })
    expect(w.find('button').classes().join(' ')).toContain('bg-surface-elevated')

    await w.find('button').trigger('click')
    const panel = w.find('.menu').element.parentElement
    expect(panel?.className).toContain('bg-surface-elevated')
    expect(panel?.className).toContain('border-border')
  })
})
