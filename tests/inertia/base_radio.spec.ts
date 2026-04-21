import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import BaseRadio from '../../inertia/components/base/BaseRadio.vue'

test('emits update:modelValue when option selected', async () => {
  const w = mount(BaseRadio, {
    props: {
      label: 'Mode',
      name: 'mode',
      options: [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
      ],
      modelValue: null,
    },
  })
  await w.findAll('input[type=\"radio\"]')[1].setValue()
  expect(w.emitted('update:modelValue')?.[0]).toEqual(['b'])
})
