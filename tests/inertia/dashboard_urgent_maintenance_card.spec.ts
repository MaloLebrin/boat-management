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
  useDateFormat: () => ({ formatDate: (v: string) => `date:${v}` }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

import DashboardUrgentMaintenanceCard from '../../inertia/components/dashboard/DashboardUrgentMaintenanceCard.vue'
import { URGENT_DISPLAY_CAP } from '../../shared/constants/dashboard'
import type { DashboardUrgentMaintenanceRow } from '../../shared/types/dashboard'

const TODAY = '2026-09-26'

function dateRow(id: number, dueAt: string): DashboardUrgentMaintenanceRow {
  return {
    id,
    boatId: 10 + id,
    boatName: `Boat ${id}`,
    subject: 'engine',
    title: `Task ${id}`,
    kind: 'date',
    dueAt,
    dueEngineHours: null,
    currentEngineHours: null,
  }
}

function hoursRow(id: number): DashboardUrgentMaintenanceRow {
  return {
    id,
    boatId: 10 + id,
    boatName: `Boat ${id}`,
    subject: 'engine',
    title: `Hours ${id}`,
    kind: 'hours',
    dueAt: null,
    dueEngineHours: 350,
    currentEngineHours: 342,
  }
}

function mountCard(rows: DashboardUrgentMaintenanceRow[], overdueCount = 0, total = rows.length) {
  return mount(DashboardUrgentMaintenanceCard, {
    props: { rows, overdueCount, total, todayIso: TODAY },
  })
}

describe('DashboardUrgentMaintenanceCard (#828)', () => {
  test('caps the list at five rows and links to the planning for the rest', () => {
    const rows = Array.from({ length: 8 }, (_, i) => dateRow(i + 1, '2026-10-01'))
    const w = mountCard(rows)

    expect(URGENT_DISPLAY_CAP).toBe(5)
    expect(w.findAll('[data-testid="dashboard-urgent-row"]').length).toBe(5)
    const more = w.get('[data-testid="dashboard-urgent-view-more"]')
    expect(more.attributes('href')).toBe('/planning')
    expect(more.text()).toContain('dashboard.urgentMaintenance.viewMore(3)')
  })

  test('shows no "view more" link when everything fits', () => {
    const rows = Array.from({ length: 5 }, (_, i) => dateRow(i + 1, '2026-10-01'))
    const w = mountCard(rows)
    expect(w.findAll('[data-testid="dashboard-urgent-row"]').length).toBe(5)
    expect(w.find('[data-testid="dashboard-urgent-view-more"]').exists()).toBe(false)
  })

  test('renders the empty state when there is nothing urgent', () => {
    const w = mountCard([])
    expect(w.text()).toContain('dashboard.urgentMaintenance.empty')
    expect(w.findAll('[data-testid="dashboard-urgent-row"]').length).toBe(0)
  })

  test('shows the overdue badge with the overdue count, not the urgent total', () => {
    const w = mountCard([dateRow(1, '2026-09-20')], 3, 10)
    const badge = w.get('[data-testid="dashboard-overdue-badge"]')
    expect(badge.text()).toBe('dashboard.overdueAlert(3)')
    expect(w.text()).toContain('· 10')
  })

  test('hides the overdue badge when nothing is overdue', () => {
    const w = mountCard([dateRow(1, '2026-10-01')], 0)
    expect(w.find('[data-testid="dashboard-overdue-badge"]').exists()).toBe(false)
  })

  test('always offers a link to the planning in the header', () => {
    const links = mountCard([]).findAll('a[href="/planning"]')
    expect(links.length).toBeGreaterThanOrEqual(1)
    expect(links[0].text()).toContain('dashboard.viewPlanning')
  })

  test('each row is a single link to the planning centred on its task, with an aria-label', () => {
    const w = mountCard([dateRow(42, '2026-10-01')])
    const row = w.get('[data-testid="dashboard-urgent-row"]')
    expect(row.attributes('href')).toBe('/planning?task=42')
    expect(row.attributes('aria-label')).toBe(
      'dashboard.urgentMaintenance.openTask(Task 42,Boat 42)'
    )
    expect(row.findAll('a').length).toBe(0)
  })

  test('labels rows overdue, due soon or hours from the injected today', () => {
    const w = mountCard([dateRow(1, '2026-09-25'), dateRow(2, '2026-09-26'), hoursRow(3)])
    const rows = w.findAll('[data-testid="dashboard-urgent-row"]')
    expect(rows[0].text()).toContain('dashboard.urgentMaintenance.overdue')
    expect(rows[0].text()).toContain('date:2026-09-25')
    expect(rows[1].text()).toContain('dashboard.urgentMaintenance.dueSoon')
    expect(rows[2].text()).toContain('dashboard.urgentMaintenance.hours')
    expect(rows[2].text()).toContain('dashboard.urgentMaintenance.dueAtHours(350,342)')
  })
})
