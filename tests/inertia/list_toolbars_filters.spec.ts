import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import ClientListToolbar from '../../inertia/components/clients/ClientListToolbar.vue'
import InvoiceListToolbar from '../../inertia/components/invoices/InvoiceListToolbar.vue'
import BoatListToolbar from '../../inertia/components/boats/list/BoatListToolbar.vue'
import EngineListToolbar from '../../inertia/components/engines/list/EngineListToolbar.vue'
import MaintenanceHistoryToolbar from '../../inertia/components/maintenance/MaintenanceHistoryToolbar.vue'
import { mountWithStubs, routerSpies } from './helpers/mount'

vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

/**
 * Caractérisation des cinq barres de filtres de liste (vague 3.5), écrite
 * avant d'extraire `useListFilters` : recherche avec anti-rebond de 300 ms,
 * normalisation propre à chaque liste, remise à la page 1, et forme exacte de
 * la visite (clients, factures) ou de l'événement émis (bateaux, moteurs,
 * historique d'entretien).
 */
const VISIT_OPTIONS = { preserveScroll: true, preserveState: true, replace: true }

async function typeSearch(wrapper: ReturnType<typeof mountWithStubs>, value: string) {
  await wrapper.find('[data-base-input] input').setValue(value)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ClientListToolbar', () => {
  const filters = {
    q: 'old',
    status: 'active' as const,
    sort: 'name' as const,
    direction: 'asc' as const,
    page: 3,
    perPage: 20,
  }

  test('debounces the search and visits /clients on page 1 with empty values dropped', async () => {
    const wrapper = mountWithStubs(ClientListToolbar, { props: { filters } })

    await typeSearch(wrapper, 'dup')
    await typeSearch(wrapper, 'dupont')
    expect(routerSpies.get).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(300)

    expect(routerSpies.get).toHaveBeenCalledTimes(1)
    expect(routerSpies.get).toHaveBeenCalledWith(
      '/clients',
      {
        q: 'dupont',
        status: 'active',
        sort: 'name',
        direction: 'asc',
        page: 1,
        perPage: 20,
      },
      VISIT_OPTIONS
    )
  })

  test('clearing the search drops q from the query', async () => {
    const wrapper = mountWithStubs(ClientListToolbar, { props: { filters } })

    await typeSearch(wrapper, '')
    await vi.advanceTimersByTimeAsync(300)

    expect(routerSpies.get.mock.calls[0][1]).toMatchObject({ q: undefined, page: 1 })
  })

  test('the search field keeps what the user typed until the server answers', async () => {
    const wrapper = mountWithStubs(ClientListToolbar, { props: { filters } })

    await typeSearch(wrapper, 'dupont')

    expect((wrapper.find('[data-base-input] input').element as HTMLInputElement).value).toBe(
      'dupont'
    )
  })

  test('the search field follows a new q coming from the server', async () => {
    const wrapper = mountWithStubs(ClientListToolbar, { props: { filters } })

    await wrapper.setProps({ filters: { ...filters, q: 'from-server' } })

    expect((wrapper.find('[data-base-input] input').element as HTMLInputElement).value).toBe(
      'from-server'
    )
  })

  test('changing the status visits immediately on page 1, an empty status is dropped', async () => {
    const wrapper = mountWithStubs(ClientListToolbar, { props: { filters } })

    await wrapper.find('[data-base-select] select').setValue('')

    expect(routerSpies.get).toHaveBeenCalledWith(
      '/clients',
      { q: 'old', status: undefined, sort: 'name', direction: 'asc', page: 1, perPage: 20 },
      VISIT_OPTIONS
    )
  })
})

describe('InvoiceListToolbar', () => {
  const filters = {
    q: '',
    status: '' as const,
    kind: 'invoice' as const,
    clientId: 12,
    issuedFrom: '2026-01-01',
    issuedTo: '',
    sort: 'issuedAt' as const,
    direction: 'desc' as const,
    page: 2,
    perPage: 20,
  }
  const clientOptions = [{ id: 12, fullName: 'Alice Martin' }]

  test('debounces the search and visits /invoices with every empty filter dropped', async () => {
    const wrapper = mountWithStubs(InvoiceListToolbar, { props: { filters, clientOptions } })

    await typeSearch(wrapper, 'FAC')
    await vi.advanceTimersByTimeAsync(300)

    expect(routerSpies.get).toHaveBeenCalledWith(
      '/invoices',
      {
        q: 'FAC',
        status: undefined,
        kind: 'invoice',
        clientId: 12,
        issuedFrom: '2026-01-01',
        issuedTo: undefined,
        sort: 'issuedAt',
        direction: 'desc',
        page: 1,
        perPage: 20,
      },
      VISIT_OPTIONS
    )
  })

  test('each select and date filter visits immediately on page 1', async () => {
    const wrapper = mountWithStubs(InvoiceListToolbar, { props: { filters, clientOptions } })
    const selects = wrapper.findAll('[data-base-select] select')
    const dates = wrapper.findAll('[data-base-input] input[type="date"]')

    await selects[0].setValue('paid')
    await selects[1].setValue('')
    await selects[2].setValue('')
    await dates[1].setValue('2026-12-31')

    const queries = routerSpies.get.mock.calls.map((call) => call[1])
    expect(queries[0]).toMatchObject({ status: 'paid', page: 1 })
    expect(queries[1]).toMatchObject({ kind: undefined, page: 1 })
    expect(queries[2]).toMatchObject({ clientId: undefined, page: 1 })
    expect(queries[3]).toMatchObject({ issuedTo: '2026-12-31', page: 1 })
  })
})

describe('emitting toolbars', () => {
  test('BoatListToolbar emits update:filters with q (empty → undefined) on page 1', async () => {
    const filters = { q: 'x', sort: 'recent', direction: 'asc', page: 4, perPage: 20 }
    const wrapper = mountWithStubs(BoatListToolbar, {
      props: {
        filters,
        viewMode: 'table',
        total: 3,
        categoryOptions: [],
        propulsionOptions: [],
      },
      stubs: { BaseTabs: { template: '<div />' } },
    })

    await typeSearch(wrapper, 'hermione')
    await vi.advanceTimersByTimeAsync(300)
    await typeSearch(wrapper, '')
    await vi.advanceTimersByTimeAsync(300)

    expect(wrapper.emitted('update:filters')).toEqual([
      [{ ...filters, q: 'hermione', page: 1 }],
      [{ ...filters, q: undefined, page: 1 }],
    ])
  })

  test('EngineListToolbar emits update:filters with q kept as typed on page 1', async () => {
    const filters = {
      q: '',
      boatId: 0,
      kind: '',
      status: '',
      family: '',
      sort: 'recent',
      direction: 'desc',
      page: 2,
      perPage: 20,
    }
    const wrapper = mountWithStubs(EngineListToolbar, {
      props: { filters, viewMode: 'table', total: 0, boatOptions: [] },
      stubs: { BaseTabs: { template: '<div />' } },
    })

    await typeSearch(wrapper, ' volvo ')
    await vi.advanceTimersByTimeAsync(300)

    expect(wrapper.emitted('update:filters')).toEqual([[{ ...filters, q: ' volvo ', page: 1 }]])
  })

  test('MaintenanceHistoryToolbar emits update:filters with q trimmed on page 1', async () => {
    const filters = {
      q: '',
      subject: '',
      boatId: null,
      dateFrom: '',
      dateTo: '',
      sort: 'recent',
      page: 5,
      perPage: 20,
    }
    const wrapper = mountWithStubs(MaintenanceHistoryToolbar, {
      props: { filters, boatOptions: [], total: 0 },
    })

    await typeSearch(wrapper, '  vidange ')
    await vi.advanceTimersByTimeAsync(299)
    expect(wrapper.emitted('update:filters')).toBeUndefined()
    await vi.advanceTimersByTimeAsync(1)

    expect(wrapper.emitted('update:filters')).toEqual([[{ ...filters, q: 'vidange', page: 1 }]])
  })
})
