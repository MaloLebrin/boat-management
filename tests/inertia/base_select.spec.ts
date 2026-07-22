import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string) => (key === 'common.selectPlaceholder' ? 'Sélectionner…' : key),
  }),
}))

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
      allowEmpty: true,
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

test('can emit empty value when allowEmpty is true', async () => {
  const w = mount(BaseSelect, {
    props: {
      id: 's3',
      label: 'Type',
      allowEmpty: true,
      options: [{ label: 'One', value: '1' }],
      modelValue: '1',
    },
  })
  await w.find('select').setValue('')
  expect(w.emitted('update:modelValue')?.[0]).toEqual([''])
})

test('hides placeholder option when a real value is already selected and allowEmpty is false', () => {
  const w = mount(BaseSelect, {
    props: {
      id: 's4',
      label: 'Sort',
      options: [
        { label: 'Recent', value: 'recent' },
        { label: 'Name', value: 'name' },
      ],
      modelValue: 'recent',
    },
  })
  expect(w.findAll('option').length).toBe(2)
  expect(w.text()).not.toContain('Select…')
})

test('keeps placeholder option visible when allowEmpty is true even with a value selected', () => {
  const w = mount(BaseSelect, {
    props: {
      id: 's5',
      label: 'Type',
      allowEmpty: true,
      placeholder: 'All',
      options: [{ label: 'One', value: '1' }],
      modelValue: '1',
    },
  })
  expect(w.findAll('option').length).toBe(2)
  expect(w.text()).toContain('All')
})

test('uses translated default placeholder', () => {
  const w = mount(BaseSelect, {
    props: {
      id: 'sp',
      label: 'Type',
      options: [{ label: 'One', value: '1' }],
      modelValue: '',
    },
  })
  expect(w.text()).toContain('Sélectionner…')
  expect(w.text()).not.toContain('Select…')
})

test('renders error from errors object using name', () => {
  const w = mount(BaseSelect, {
    props: {
      id: 'kind',
      name: 'kind',
      label: 'Kind',
      options: [{ label: 'Inboard', value: 'inboard' }],
      modelValue: '',
      errors: { kind: 'Required' },
    },
  })
  expect(w.get('[role="alert"]').text()).toBe('Required')
})
