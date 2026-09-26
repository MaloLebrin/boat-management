import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (k: string, params?: Record<string, string>) =>
      params ? `${k}(${Object.values(params).join(',')})` : k,
    locale: { value: 'fr' },
  }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({
    formatWeekdayDay: (v: string) => `wd:${v.slice(0, 10)}`,
    formatTime: () => '09:00',
  }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

vi.mock('~/components/reservations/ReservationStatusBadge.vue', () => ({
  default: { props: ['status'], template: '<span data-testid="status">{{ status }}</span>' },
}))

import DashboardUpcomingReservationsCard from '../../inertia/components/dashboard/DashboardUpcomingReservationsCard.vue'
import type { DashboardUpcomingReservation } from '../../shared/types/dashboard'

const items: DashboardUpcomingReservation[] = [
  {
    id: 1,
    boatId: 4,
    boatName: 'Albatros',
    clientName: 'M. Roux',
    status: 'confirmed',
    type: 'bareboat',
    event: 'departure',
    at: '2026-09-27T09:00:00.000Z',
    startsAt: '2026-09-27T09:00:00.000Z',
    endsAt: '2026-10-04T09:00:00.000Z',
  },
  {
    id: 2,
    boatId: 5,
    boatName: 'Tempête Douce',
    clientName: 'Mme Le Gall',
    status: 'option',
    type: null,
    event: 'return',
    at: '2026-09-28T09:00:00.000Z',
    startsAt: '2026-09-20T09:00:00.000Z',
    endsAt: '2026-09-28T09:00:00.000Z',
  },
]

describe('DashboardUpcomingReservationsCard (#832)', () => {
  test('renders one linked row per event with day, boat, kind, client and status', () => {
    const w = mount(DashboardUpcomingReservationsCard, { props: { items } })
    const rows = w.findAll('[data-testid="dashboard-upcoming-row"]')
    expect(rows.map((r) => r.attributes('href'))).toEqual([
      '/reservations?boatId=4',
      '/reservations?boatId=5',
    ])
    expect(rows[0].text()).toContain('wd:2026-09-27')
    expect(rows[0].text()).toContain('Albatros')
    expect(rows[0].text()).toContain('dashboard.upcoming.departure(09:00)')
    expect(rows[0].text()).toContain('M. Roux')
    expect(rows[1].text()).toContain('dashboard.upcoming.return(09:00)')
    expect(w.findAll('[data-testid="status"]').map((s) => s.text())).toEqual([
      'confirmed',
      'option',
    ])
    expect(w.get('[data-testid="dashboard-upcoming-view-all"]').attributes('href')).toBe(
      '/reservations'
    )
    expect(w.text()).toContain('dashboard.upcoming.period(7)')
  })

  test('renders the empty state', () => {
    const w = mount(DashboardUpcomingReservationsCard, { props: { items: [] } })
    expect(w.text()).toContain('dashboard.upcoming.empty')
    expect(w.findAll('[data-testid="dashboard-upcoming-row"]').length).toBe(0)
  })
})
