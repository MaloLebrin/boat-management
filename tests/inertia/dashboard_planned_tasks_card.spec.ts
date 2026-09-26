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
  useDateFormat: () => ({ formatDate: (v: string) => `d:${v}` }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

import DashboardPlannedTasksCard from '../../inertia/components/dashboard/DashboardPlannedTasksCard.vue'
import type { DashboardPlannedTasks } from '../../shared/types/dashboard'

const planned: DashboardPlannedTasks = {
  total: 7,
  items: [
    {
      id: 11,
      boatId: 4,
      boatName: 'Albatros',
      title: 'Vidange',
      subject: 'engine',
      dueAt: '2026-09-28',
    },
    {
      id: 12,
      boatId: 5,
      boatName: 'Sirocco',
      title: 'Antifouling',
      subject: 'boat',
      dueAt: '2026-10-10',
    },
  ],
}

describe('DashboardPlannedTasksCard', () => {
  test('shows a skeleton while the deferred prop has not arrived', () => {
    const w = mount(DashboardPlannedTasksCard, { props: { plannedTasks: undefined } })
    expect(w.find('[data-testid="dashboard-planned-skeleton"]').exists()).toBe(true)
    expect(w.findAll('[data-testid="dashboard-planned-row"]').length).toBe(0)
    expect(w.text()).toContain('dashboard.plannedTasks.period(30)')
  })

  test('renders the empty state once loaded without tasks', () => {
    const w = mount(DashboardPlannedTasksCard, { props: { plannedTasks: { items: [], total: 0 } } })
    expect(w.text()).toContain('dashboard.plannedTasks.empty')
    expect(w.find('[data-testid="dashboard-planned-more"]').exists()).toBe(false)
  })

  test('renders one linked row per task and the remaining count', () => {
    const w = mount(DashboardPlannedTasksCard, { props: { plannedTasks: planned } })
    const rows = w.findAll('[data-testid="dashboard-planned-row"]')
    expect(rows.map((r) => r.attributes('href'))).toEqual([
      '/planning?task=11',
      '/planning?task=12',
    ])
    expect(rows[0].text()).toContain('Albatros')
    expect(rows[0].text()).toContain('Vidange')
    expect(rows[0].text()).toContain('maintenance.history.subjects.engine')
    expect(rows[0].text()).toContain('d:2026-09-28')
    expect(w.get('[data-testid="dashboard-planned-more"]').text()).toBe(
      'dashboard.plannedTasks.more(5)'
    )
    expect(w.get('[data-testid="dashboard-planned-view-all"]').attributes('href')).toBe('/planning')
  })
})
