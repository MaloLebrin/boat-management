import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import BaseCheckbox from '../../inertia/components/base/BaseCheckbox.vue'

test('emits update:modelValue when toggled', async () => {
  const w = mount(BaseCheckbox, {
    props: { id: 'c', label: 'Agree', modelValue: false },
    slots: { default: 'I agree' },
  })
  await w.find('input[type="checkbox"]').setValue(true)
  expect(w.emitted('update:modelValue')?.[0]).toEqual([true])
})
