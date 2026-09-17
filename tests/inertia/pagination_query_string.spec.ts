import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { test, expect, vi, beforeEach, afterEach, describe } from 'vitest'

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

const META = { currentPage: 1, lastPage: 5, total: 50, perPage: 10 }

function mountComposable(baseUrl?: string) {
  let result: ReturnType<typeof usePagination> | undefined
  const wrapper = mount(
    defineComponent({
      setup() {
        result = usePagination(META, baseUrl)
        return {}
      },
      template: '<div />',
    })
  )
  return { pagination: result!, wrapper }
}

/** Ce que la visite a envoyé en query : `data` fusionné par Inertia dans l'URL. */
function visitedData(): Record<string, unknown> {
  const [, options] = routerVisit.mock.calls[0]!
  return (options as { data: Record<string, unknown> }).data
}

/**
 * Changer de page ne doit pas vider la query string (#677 bis) : `data` est la
 * *totalité* de la query d'une visite GET Inertia, donc `{ page }` seul effaçait
 * les filtres que le serveur venait de rendre.
 */
describe('usePagination preserves the current query string', () => {
  const originalUrl = window.location.href

  beforeEach(() => {
    routerVisit.mockClear()
    window.history.replaceState({}, '', '/notifications')
  })
  afterEach(() => window.history.replaceState({}, '', originalUrl))

  test('keeps the filters of the current URL alongside the new page', () => {
    window.history.replaceState({}, '', '/invoices?q=quai&status=draft&page=2')
    mountComposable('/invoices').pagination.goToPage(3)

    expect(visitedData()).toEqual({ q: 'quai', status: 'draft', page: 3 })
  })

  test('the new page wins over the page of the current URL', () => {
    window.history.replaceState({}, '', '/invoices?page=2')
    mountComposable('/invoices').pagination.goToPage(4)

    expect(visitedData()).toEqual({ page: 4 })
  })

  test('sends the page alone when the current URL carries no filter', () => {
    mountComposable('/notifications').pagination.goToPage(2)

    expect(visitedData()).toEqual({ page: 2 })
  })

  test('keeps the filters when the URL is deduced from the current location', () => {
    window.history.replaceState({}, '', '/clients?q=martin')
    mountComposable().pagination.goToPage(2)

    expect(routerVisit).toHaveBeenCalledWith('/clients', expect.anything())
    expect(visitedData()).toEqual({ q: 'martin', page: 2 })
  })

  test('keeps a repeated filter as a list, instead of the last value only', () => {
    window.history.replaceState({}, '', '/invoices?status=draft&status=sent')
    mountComposable('/invoices').pagination.goToPage(2)

    expect(visitedData()).toEqual({ status: ['draft', 'sent'], page: 2 })
  })

  test('still sends preserveScroll and preserveState', () => {
    mountComposable('/invoices').pagination.goToPage(2)

    const [, options] = routerVisit.mock.calls[0]!
    expect(options).toMatchObject({ preserveScroll: true, preserveState: true })
  })
})
