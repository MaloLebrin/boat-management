import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import BasePagination from '../../inertia/components/base/BasePagination.vue'

test('emits update:page when next clicked', async () => {
  const w = mount(BasePagination, { props: { page: 1, pageCount: 3 } })
  await w.findAll('button')[1].trigger('click')
  expect(w.emitted('update:page')?.[0]).toEqual([2])
})
