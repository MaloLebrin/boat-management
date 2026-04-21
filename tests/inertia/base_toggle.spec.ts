import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import BaseToggle from '../../inertia/components/base/BaseToggle.vue'

test('toggles on click', async () => {
  const w = mount(BaseToggle, {
    props: { id: 't', label: 'Enabled', modelValue: false },
    slots: { default: 'Toggle' },
  })
  await w.find('button[role=\"switch\"]').trigger('click')
  expect(w.emitted('update:modelValue')?.[0]).toEqual([true])
})
