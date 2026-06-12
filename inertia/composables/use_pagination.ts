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
      data: { page },
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
