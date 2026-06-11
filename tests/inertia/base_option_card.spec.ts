import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import BaseOptionCard from '../../inertia/components/base/BaseOptionCard.vue'

test('renders slot content', () => {
  const w = mount(BaseOptionCard, {
    props: { selected: false },
    slots: { default: 'Option Text' },
  })
  expect(w.text()).toContain('Option Text')
})

test('applies unselected classes by default when not selected', () => {
  const w = mount(BaseOptionCard, {
    props: { selected: false },
    slots: { default: 'Test' },
  })
  expect(w.classes().join(' ')).toContain('border-bone')
})

test('applies selected classes when selected', () => {
  const w = mount(BaseOptionCard, {
    props: { selected: true },
    slots: { default: 'Test' },
  })
  expect(w.classes().join(' ')).toContain('border-coral-500')
})

test('uses custom selectedClass when provided', () => {
  const w = mount(BaseOptionCard, {
    props: { selected: true, selectedClass: 'border-mint-500 bg-mint-100' },
    slots: { default: 'Test' },
  })
  expect(w.classes().join(' ')).toContain('border-mint-500')
})

test('uses custom unselectedClass when provided', () => {
  const w = mount(BaseOptionCard, {
    props: { selected: false, unselectedClass: 'border-navy-200 bg-navy-50' },
    slots: { default: 'Test' },
  })
  expect(w.classes().join(' ')).toContain('border-navy-200')
})

test('emits click when clicked', async () => {
  const w = mount(BaseOptionCard, {
    props: { selected: false },
    slots: { default: 'Test' },
  })
  await w.trigger('click')
  expect(w.emitted('click')).toBeTruthy()
})

test('has disabled attribute when disabled prop is true', () => {
  const w = mount(BaseOptionCard, {
    props: { selected: false, disabled: true },
    slots: { default: 'Test' },
  })
  expect(w.attributes('disabled')).toBeDefined()
})

test('renders as a button element', () => {
  const w = mount(BaseOptionCard, {
    props: { selected: false },
    slots: { default: 'Test' },
  })
  expect(w.element.tagName).toBe('BUTTON')
})
