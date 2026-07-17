import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const routerGet = vi.fn()

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    Head: { template: '<div><slot /></div>' },
    router: { get: (...args: unknown[]) => routerGet(...args) },
    usePage: () => ({ props: { appT: {}, locale: 'en' } }),
  }
})

vi.mock('~/components/reservations/ReservationTimeline.vue', () => ({
  default: { template: '<div data-testid="timeline" />' },
}))

vi.mock('~/components/reservations/FleetReservationList.vue', () => ({
  default: { template: '<div data-testid="list" />' },
}))

vi.mock('~/components/reservations/ReservationCreateButton.vue', () => ({
  default: {
    props: ['boats', 'selectedBoatId'],
    template: '<div data-testid="create-button" />',
  },
}))

import ReservationsIndex from '../../inertia/pages/reservations/index.vue'

const boats = [
  { id: 5, name: 'Mistral' },
  { id: 6, name: 'Bora Bora' },
]

const baseProps = {
  reservations: [],
  calendarEntries: [],
  boats,
  selectedBoatId: null,
  canCreateQuote: false,
}

let matchMediaMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  routerGet.mockClear()
  matchMediaMock = vi.fn().mockReturnValue({ matches: false })
  vi.stubGlobal('matchMedia', matchMediaMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('boat filter select has an explicit label', () => {
  const w = mount(ReservationsIndex, { props: baseProps })
  const label = w.find('label')
  expect(label.exists()).toBe(true)
  expect(label.text()).toBe('reservations.fleet.filterLabel')
})

test('boat filter shows "all boats" as the selected option when unfiltered', () => {
  const w = mount(ReservationsIndex, { props: baseProps })
  const select = w.get('select')
  expect(select.element.value).toBe('')
  // Exactly one empty-value option: the "all boats" placeholder, no duplicate.
  const emptyOptions = w.findAll('option').filter((o) => o.attributes('value') === '')
  expect(emptyOptions).toHaveLength(1)
  expect(emptyOptions[0].text()).toBe('reservations.calendar.allBoats')
})

test('changing the filter navigates with the boat id', async () => {
  const w = mount(ReservationsIndex, { props: baseProps })
  await w.get('select').setValue('6')
  expect(routerGet).toHaveBeenCalledWith(
    '/reservations',
    { boatId: '6' },
    expect.objectContaining({ preserveScroll: true })
  )
})

test('renders a create-reservation button fed with the fleet boats', () => {
  const w = mount(ReservationsIndex, { props: baseProps })
  const btn = w.get('[data-testid="create-button"]')
  expect(btn.exists()).toBe(true)
})

test('defaults to the fleet timeline view on wide viewports', () => {
  const w = mount(ReservationsIndex, { props: baseProps })
  expect(w.find('[data-testid="timeline"]').exists()).toBe(true)
  expect(w.find('[data-testid="list"]').exists()).toBe(false)
})

test('defaults to the list view on narrow viewports', async () => {
  matchMediaMock.mockReturnValue({ matches: true })
  const w = mount(ReservationsIndex, { props: baseProps })
  await w.vm.$nextTick()
  expect(w.find('[data-testid="list"]').exists()).toBe(true)
  expect(w.find('[data-testid="timeline"]').exists()).toBe(false)
})
