import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { test, expect, vi, beforeEach } from 'vitest'

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    router: { visit: vi.fn() },
  }
})

import { router } from '@inertiajs/vue3'
import { usePagination } from '../../inertia/composables/use_pagination'

const routerVisit = vi.mocked(router.visit)

function mountComposable(meta: Parameters<typeof usePagination>[0], baseUrl?: string) {
  let result: ReturnType<typeof usePagination> | undefined

  mount(
    defineComponent({
      setup() {
        result = usePagination(meta, baseUrl)
        return {}
      },
      template: '<div />',
    })
  )

  return result!
}

beforeEach(() => {
  routerVisit.mockClear()
})

test('hasPreviousPage is false when currentPage is 1', () => {
  const { hasPreviousPage } = mountComposable({
    currentPage: 1,
    lastPage: 5,
    total: 50,
    perPage: 10,
  })
  expect(hasPreviousPage.value).toBe(false)
})

test('hasPreviousPage is true when currentPage is greater than 1', () => {
  const { hasPreviousPage } = mountComposable({
    currentPage: 2,
    lastPage: 5,
    total: 50,
    perPage: 10,
  })
  expect(hasPreviousPage.value).toBe(true)
})

test('hasNextPage is false when currentPage equals lastPage', () => {
  const { hasNextPage } = mountComposable({ currentPage: 5, lastPage: 5, total: 50, perPage: 10 })
  expect(hasNextPage.value).toBe(false)
})

test('hasNextPage is true when currentPage is less than lastPage', () => {
  const { hasNextPage } = mountComposable({ currentPage: 3, lastPage: 5, total: 50, perPage: 10 })
  expect(hasNextPage.value).toBe(true)
})

test('hasPreviousPage and hasNextPage are both true in the middle', () => {
  const { hasPreviousPage, hasNextPage } = mountComposable({
    currentPage: 3,
    lastPage: 5,
    total: 50,
    perPage: 10,
  })
  expect(hasPreviousPage.value).toBe(true)
  expect(hasNextPage.value).toBe(true)
})

test('goToPage calls router.visit with correct options for a valid page', () => {
  const { goToPage } = mountComposable(
    { currentPage: 1, lastPage: 5, total: 50, perPage: 10 },
    '/boats'
  )
  goToPage(3)
  expect(routerVisit).toHaveBeenCalledOnce()
  expect(routerVisit).toHaveBeenCalledWith('/boats', {
    data: { page: 3 },
    preserveScroll: true,
    preserveState: true,
  })
})

test('goToPage is a no-op when page is less than 1', () => {
  const { goToPage } = mountComposable(
    { currentPage: 2, lastPage: 5, total: 50, perPage: 10 },
    '/boats'
  )
  goToPage(0)
  expect(routerVisit).not.toHaveBeenCalled()
})

test('goToPage is a no-op when page is greater than lastPage', () => {
  const { goToPage } = mountComposable(
    { currentPage: 2, lastPage: 5, total: 50, perPage: 10 },
    '/boats'
  )
  goToPage(6)
  expect(routerVisit).not.toHaveBeenCalled()
})

test('goToPage accepts page equal to lastPage (boundary)', () => {
  const { goToPage } = mountComposable(
    { currentPage: 1, lastPage: 5, total: 50, perPage: 10 },
    '/boats'
  )
  goToPage(5)
  expect(routerVisit).toHaveBeenCalledOnce()
})

test('goToPage accepts page equal to 1 (boundary)', () => {
  const { goToPage } = mountComposable(
    { currentPage: 3, lastPage: 5, total: 50, perPage: 10 },
    '/boats'
  )
  goToPage(1)
  expect(routerVisit).toHaveBeenCalledOnce()
})

test('accepts a ref as meta', () => {
  const meta = ref({ currentPage: 1, lastPage: 3, total: 30, perPage: 10 })

  let result: ReturnType<typeof usePagination> | undefined
  mount(
    defineComponent({
      setup() {
        result = usePagination(meta, '/boats')
        return {}
      },
      template: '<div />',
    })
  )

  expect(result!.currentPage.value).toBe(1)
  expect(result!.lastPage.value).toBe(3)
  expect(result!.hasNextPage.value).toBe(true)
  expect(result!.hasPreviousPage.value).toBe(false)
})

test('accepts a getter function as meta', () => {
  const { currentPage, lastPage } = mountComposable(() => ({
    currentPage: 2,
    lastPage: 4,
    total: 40,
    perPage: 10,
  }))
  expect(currentPage.value).toBe(2)
  expect(lastPage.value).toBe(4)
})

test('exposes total and perPage from meta', () => {
  const { total, perPage } = mountComposable({
    currentPage: 1,
    lastPage: 5,
    total: 50,
    perPage: 10,
  })
  expect(total.value).toBe(50)
  expect(perPage.value).toBe(10)
})
