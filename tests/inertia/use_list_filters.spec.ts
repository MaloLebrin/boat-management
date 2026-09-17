import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { defineComponent, nextTick, reactive } from 'vue'
import { compactQuery, useListFilters, visitList } from '../../inertia/composables/use_list_filters'
import { routerSpies } from './helpers/inertia_mock'

vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

interface Filters {
  q?: string
  status: string
  page: number
}

function setup(
  initial: Filters,
  options: Partial<Parameters<typeof useListFilters<Filters>>[0]> = {}
) {
  const state = reactive({ filters: initial })
  const apply = vi.fn()
  let api!: ReturnType<typeof useListFilters<Filters>>
  mount(
    defineComponent({
      setup() {
        api = useListFilters<Filters>({ filters: () => state.filters, apply, ...options })
        return () => null
      },
    })
  )
  return { state, apply, api }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useListFilters', () => {
  test('the search draft starts from the current q ("" when absent)', () => {
    expect(setup({ q: 'abc', status: '', page: 1 }).api.qDraft.value).toBe('abc')
    expect(setup({ status: '', page: 1 }).api.qDraft.value).toBe('')
  })

  test('the draft follows a new q coming from the server', async () => {
    const { state, api } = setup({ q: 'abc', status: '', page: 1 })

    state.filters = { ...state.filters, q: 'server' }
    await nextTick()

    expect(api.qDraft.value).toBe('server')
  })

  test('update merges the partial into the current filters and applies it', () => {
    const { apply, api } = setup({ q: 'abc', status: '', page: 3 })

    api.update({ status: 'paid', page: 1 })

    expect(apply).toHaveBeenCalledWith({ q: 'abc', status: 'paid', page: 1 })
  })

  test('onSearchInput updates the draft now and applies once after 300 ms, on page 1', async () => {
    const { apply, api } = setup({ q: '', status: 'x', page: 4 })

    api.onSearchInput('he')
    api.onSearchInput('hermione')
    expect(api.qDraft.value).toBe('hermione')
    await vi.advanceTimersByTimeAsync(299)
    expect(apply).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)

    expect(apply).toHaveBeenCalledTimes(1)
    expect(apply).toHaveBeenCalledWith({ q: 'hermione', status: 'x', page: 1 })
  })

  test('the search value goes through normalizeSearch', async () => {
    const { apply, api } = setup(
      { q: '', status: '', page: 1 },
      { normalizeSearch: (value) => value.trim() || undefined }
    )

    api.onSearchInput('  ')
    await vi.advanceTimersByTimeAsync(300)

    expect(apply).toHaveBeenCalledWith({ q: undefined, status: '', page: 1 })
  })

  test('the debounce delay is configurable', async () => {
    const { apply, api } = setup({ q: '', status: '', page: 1 }, { debounceMs: 50 })

    api.onSearchInput('x')
    await vi.advanceTimersByTimeAsync(50)

    expect(apply).toHaveBeenCalledTimes(1)
  })
})

describe('compactQuery', () => {
  test('drops empty strings, null and undefined, keeps every other value', () => {
    expect(
      compactQuery({ q: '', status: null, kind: undefined, clientId: 12, page: 1, flag: false })
    ).toEqual({
      q: undefined,
      status: undefined,
      kind: undefined,
      clientId: 12,
      page: 1,
      flag: false,
    })
  })
})

describe('visitList', () => {
  test('replaces the history entry and keeps scroll and state', () => {
    visitList('/clients', { q: '', page: 1 })

    expect(routerSpies.get).toHaveBeenCalledWith(
      '/clients',
      { q: undefined, page: 1 },
      { preserveScroll: true, preserveState: true, replace: true }
    )
  })
})
