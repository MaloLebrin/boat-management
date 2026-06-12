import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import BasePagination from '../../inertia/components/base/BasePagination.vue'

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    name: 'MockInertiaLink',
    props: { route: { type: String, required: false } },
    template: '<a data-link><slot /></a>',
  },
}))

test('emits update:page with page + 1 when next clicked', async () => {
  const w = mount(BasePagination, { props: { page: 1, pageCount: 3 } })
  await w.findAll('button')[1].trigger('click')
  expect(w.emitted('update:page')?.[0]).toEqual([2])
})

test('emits update:page with page - 1 when prev clicked', async () => {
  const w = mount(BasePagination, { props: { page: 2, pageCount: 3 } })
  await w.findAll('button')[0].trigger('click')
  expect(w.emitted('update:page')?.[0]).toEqual([1])
})

test('prev button is disabled on first page', () => {
  const w = mount(BasePagination, { props: { page: 1, pageCount: 3 } })
  const prevBtn = w.findAll('button')[0]
  expect(prevBtn.attributes('disabled')).toBeDefined()
})

test('next button is disabled on last page', () => {
  const w = mount(BasePagination, { props: { page: 3, pageCount: 3 } })
  const nextBtn = w.findAll('button')[1]
  expect(nextBtn.attributes('disabled')).toBeDefined()
})

test('both buttons are enabled when page is in the middle', () => {
  const w = mount(BasePagination, { props: { page: 2, pageCount: 5 } })
  const [prevBtn, nextBtn] = w.findAll('button')
  expect(prevBtn.attributes('disabled')).toBeUndefined()
  expect(nextBtn.attributes('disabled')).toBeUndefined()
})

test('displays current page and total page count', () => {
  const w = mount(BasePagination, { props: { page: 2, pageCount: 5 } })
  expect(w.text()).toContain('2')
  expect(w.text()).toContain('5')
})
