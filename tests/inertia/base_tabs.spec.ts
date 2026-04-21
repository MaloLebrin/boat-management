import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import BaseTabs from '../../inertia/components/base/BaseTabs.vue'

test('emits update:modelValue on click', async () => {
  const w = mount(BaseTabs, {
    props: {
      modelValue: 'a',
      tabs: [
        { key: 'a', label: 'A' },
        { key: 'b', label: 'B' },
      ],
    },
  })
  await w.findAll('button')[1].trigger('click')
  expect(w.emitted('update:modelValue')?.[0]).toEqual(['b'])
})
