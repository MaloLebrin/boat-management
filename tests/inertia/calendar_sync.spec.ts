import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import CalendarFeedPanel from '../../inertia/components/reservations/calendar_sync/CalendarFeedPanel.vue'
import ExternalCalendarList from '../../inertia/components/reservations/calendar_sync/ExternalCalendarList.vue'
import ReservationCalendar from '../../inertia/components/reservations/ReservationCalendar.vue'
import type { CalendarFeedRow, ExternalCalendarRow } from '../../shared/types/calendar_sync'

/** Synchronisation iCal (#880) : flux exporté, calendriers importés, créneaux affichés. */

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (k: string, params?: Record<string, string>) =>
      params ? `${k} ${JSON.stringify(params)}` : k,
    locale: { value: 'fr' },
  }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({
    formatDateTime: (v: string) => `dt(${v})`,
    formatMonthYear: () => 'month',
    formatWeekdayShort: () => 'wd',
  }),
}))

const { formSpies, routerSpies } = vi.hoisted(() => ({
  formSpies: { post: vi.fn(), patch: vi.fn(), reset: vi.fn() },
  routerSpies: { post: vi.fn(), delete: vi.fn() },
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'fr' } }),
  useForm: (data: Record<string, unknown>) => ({
    ...data,
    errors: {},
    processing: false,
    isDirty: true,
    ...formSpies,
  }),
  router: routerSpies,
}))

const STUBS = {
  BaseButton: {
    props: ['variant', 'size', 'disabled', 'type', 'href', 'externalHref'],
    emits: ['click'],
    template:
      '<a v-if="href" :href="href"><slot /></a><button v-else data-base-button :type="type ?? \'button\'" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  BaseInput: {
    props: ['id', 'modelValue', 'label', 'placeholder', 'error', 'readonly', 'type', 'required'],
    emits: ['update:modelValue'],
    template:
      '<input :id="id" :value="modelValue" :readonly="readonly" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  BaseCheckbox: {
    props: ['id', 'modelValue', 'label', 'hint'],
    emits: ['update:modelValue'],
    template:
      '<input type="checkbox" :id="id" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
  },
  BaseBadge: { props: ['variant'], template: '<span :data-variant="variant"><slot /></span>' },
  BaseCard: { template: '<div><slot name="header" /><slot /></div>' },
  BaseConfirmModal: {
    props: ['open', 'title', 'message'],
    emits: ['confirm', 'update:open'],
    template:
      '<div v-if="open" data-confirm><button data-confirm-yes @click="$emit(\'confirm\')" /></div>',
  },
}

const FEED: CalendarFeedRow = {
  id: 1,
  boatId: 7,
  url: 'https://app.fleetai.test/calendar/abc.ics',
  webcalUrl: 'webcal://app.fleetai.test/calendar/abc.ics',
  includeClientName: false,
  includeMaintenance: false,
  createdAt: '2026-06-01T00:00:00.000Z',
}

function buttonByText(wrapper: ReturnType<typeof mount>, key: string) {
  return wrapper.findAll('button').find((b) => b.text() === key)!
}

beforeEach(() => vi.clearAllMocks())

describe('CalendarFeedPanel', () => {
  test('without a feed, a manager creates one on the given endpoint', async () => {
    const w = mount(CalendarFeedPanel, {
      props: { feed: null, endpoint: '/boats/7/calendar-feed', canManage: true },
      global: { stubs: STUBS },
    })
    expect(w.text()).toContain('reservations.calendarSync.export.empty')
    await w.find('[data-testid="calendar-feed-create"]').trigger('click')
    expect(formSpies.post).toHaveBeenCalledWith('/boats/7/calendar-feed', expect.anything())
  })

  test('shows the address, the webcal link, and revokes after confirmation', async () => {
    const w = mount(CalendarFeedPanel, {
      props: { feed: FEED, endpoint: '/reservations/calendar-feed', canManage: true },
      global: { stubs: STUBS },
    })
    expect((w.find('#calendar-feed-url').element as HTMLInputElement).value).toBe(FEED.url)
    expect(w.find('a').attributes('href')).toBe(FEED.webcalUrl)

    await buttonByText(w, 'reservations.calendarSync.export.revoke').trigger('click')
    await w.find('[data-confirm-yes]').trigger('click')
    expect(routerSpies.delete).toHaveBeenCalledWith(
      '/reservations/calendar-feed',
      expect.anything()
    )
  })

  test('regenerating asks first, then posts again', async () => {
    const w = mount(CalendarFeedPanel, {
      props: { feed: FEED, endpoint: '/boats/7/calendar-feed', canManage: true },
      global: { stubs: STUBS },
    })
    await buttonByText(w, 'reservations.calendarSync.export.regenerate').trigger('click')
    expect(formSpies.post).not.toHaveBeenCalled()
    await w.find('[data-confirm-yes]').trigger('click')
    expect(formSpies.post).toHaveBeenCalledWith('/boats/7/calendar-feed', expect.anything())
  })

  test('a reader sees the address but no action', () => {
    const w = mount(CalendarFeedPanel, {
      props: { feed: FEED, endpoint: '/boats/7/calendar-feed', canManage: false },
      global: { stubs: STUBS },
    })
    expect(w.find('#calendar-feed-url').exists()).toBe(true)
    expect(w.find('[data-testid="calendar-feed-save"]').exists()).toBe(false)
    expect(w.find('#calendar-feed-client-name').exists()).toBe(false)
  })
})

const CALENDAR: ExternalCalendarRow = {
  id: 3,
  name: 'Samboat',
  host: 'www.samboat.fr',
  lastSyncedAt: '2026-06-01T10:00:00.000Z',
  lastError: 'timeout',
  eventCount: 4,
  conflictCount: 1,
}

describe('ExternalCalendarList', () => {
  test('shows the sync state, the double bookings and the last error', () => {
    const w = mount(ExternalCalendarList, {
      props: { boatId: 7, calendars: [CALENDAR], canManage: true },
      global: { stubs: STUBS },
    })
    const row = w.find('[data-testid="external-calendar-row"]')
    expect(row.text()).toContain('www.samboat.fr')
    expect(row.text()).toContain('dt(2026-06-01T10:00:00.000Z)')
    expect(row.text()).toContain('reservations.calendarSync.import.conflicts {"count":"1"}')
    expect(w.find('[data-testid="external-calendar-error"]').text()).toBe(
      'reservations.calendarSync.errors.timeout'
    )
  })

  test('syncs, removes after confirmation, and adds a feed', async () => {
    const w = mount(ExternalCalendarList, {
      props: { boatId: 7, calendars: [CALENDAR], canManage: true },
      global: { stubs: STUBS },
    })
    await buttonByText(w, 'reservations.calendarSync.import.sync').trigger('click')
    expect(routerSpies.post).toHaveBeenCalledWith(
      '/boats/7/external-calendars/3/sync',
      {},
      expect.anything()
    )

    await buttonByText(w, 'reservations.calendarSync.import.remove').trigger('click')
    await w.find('[data-confirm-yes]').trigger('click')
    expect(routerSpies.delete).toHaveBeenCalledWith(
      '/boats/7/external-calendars/3',
      expect.anything()
    )

    await w.find('[data-testid="external-calendar-form"]').trigger('submit')
    expect(formSpies.post).toHaveBeenCalledWith('/boats/7/external-calendars', expect.anything())
  })

  test('a reader gets neither actions nor the form', () => {
    const w = mount(ExternalCalendarList, {
      props: { boatId: 7, calendars: [CALENDAR], canManage: false },
      global: { stubs: STUBS },
    })
    expect(w.find('[data-testid="external-calendar-form"]').exists()).toBe(false)
    expect(w.findAll('button')).toHaveLength(0)
  })
})

describe('ReservationCalendar — imported slots', () => {
  test('an imported slot shows on its Paris days with the platform name', () => {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const w = mount(ReservationCalendar, {
      props: {
        reservations: [],
        externalBlocks: [
          {
            id: 1,
            boatId: 7,
            calendarName: 'Samboat',
            summary: null,
            startsAt: `${month}-01T22:00:00.000Z`,
            endsAt: `${month}-04T22:00:00.000Z`,
            startsOn: `${month}-02`,
            endsOn: `${month}-05`,
          },
        ],
      },
      global: { stubs: STUBS },
    })
    const blocks = w.findAll('[data-testid="external-block"]')
    expect(blocks).toHaveLength(3)
    expect(blocks[0].text()).toBe('Samboat')
    expect(w.text()).not.toContain('reservations.calendar.noReservations')
  })
})
