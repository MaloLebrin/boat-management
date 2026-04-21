import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import BaseSelect from '../../inertia/components/base/BaseSelect.vue'

test('renders options', () => {
  const w = mount(BaseSelect, {
    props: {
      id: 's',
      label: 'Type',
      options: [
        { label: 'One', value: '1' },
        { label: 'Two', value: '2' },
      ],
    },
  })
  expect(w.findAll('option').length).toBeGreaterThanOrEqual(3) // incl placeholder
})

test('emits update:modelValue on change', async () => {
  const w = mount(BaseSelect, {
    props: {
      id: 's2',
      label: 'Type',
      options: [
        { label: 'One', value: '1' },
        { label: 'Two', value: '2' },
      ],
      modelValue: '',
    },
  })
  await w.find('select').setValue('2')
  expect(w.emitted('update:modelValue')?.[0]).toEqual(['2'])
})
