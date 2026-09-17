import { router } from '@inertiajs/vue3'
import { computed, type ComputedRef, type MaybeRefOrGetter, toValue } from 'vue'

interface PaginationMeta {
  currentPage: number
  lastPage: number
  total: number
  perPage: number
}

interface UsePaginationReturn {
  currentPage: ComputedRef<number>
  lastPage: ComputedRef<number>
  total: ComputedRef<number>
  perPage: ComputedRef<number>
  hasPreviousPage: ComputedRef<boolean>
  hasNextPage: ComputedRef<boolean>
  goToPage: (page: number) => void
}

/**
 * Filtres de l'URL courante, à réémettre avec la nouvelle page : sur une visite
 * GET, `data` est la *totalité* de la query envoyée — `{ page }` seul effaçait
 * donc la recherche et les filtres que le serveur venait de rendre.
 */
function currentQuery(): Record<string, string | string[]> {
  const search = window.location.search
  if (!search) return {}

  const query: Record<string, string | string[]> = {}
  for (const [key, value] of new URLSearchParams(search)) {
    const previous = query[key]
    if (previous === undefined) query[key] = value
    else query[key] = Array.isArray(previous) ? [...previous, value] : [previous, value]
  }
  return query
}

export function usePagination(
  meta: MaybeRefOrGetter<PaginationMeta>,
  baseUrl?: string
): UsePaginationReturn {
  const currentPage = computed(() => toValue(meta).currentPage)
  const lastPage = computed(() => toValue(meta).lastPage)
  const total = computed(() => toValue(meta).total)
  const perPage = computed(() => toValue(meta).perPage)

  const hasPreviousPage = computed(() => currentPage.value > 1)
  const hasNextPage = computed(() => currentPage.value < lastPage.value)

  function goToPage(page: number): void {
    if (page < 1 || page > lastPage.value) return

    const url = baseUrl ?? window.location.pathname
    router.visit(url, {
      data: { ...currentQuery(), page },
      preserveScroll: true,
      preserveState: true,
    })
  }

  return {
    currentPage,
    lastPage,
    total,
    perPage,
    hasPreviousPage,
    hasNextPage,
    goToPage,
  }
}
