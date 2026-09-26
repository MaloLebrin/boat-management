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

import DashboardSafetyComplianceCard from '../../inertia/components/dashboard/DashboardSafetyComplianceCard.vue'
import type { DashboardSafetyCompliance } from '../../shared/types/dashboard'

const report: DashboardSafetyCompliance = {
  checked: 3,
  compliant: 1,
  withIssues: 2,
  withoutZone: 1,
  items: [
    {
      boatId: 4,
      boatName: 'Albatros',
      zone: 'coastal',
      score: 60,
      blockingCount: 2,
      warningCount: 1,
      nextDueDate: '2026-10-02',
    },
    {
      boatId: 5,
      boatName: 'Sirocco',
      zone: 'basic',
      score: 100,
      blockingCount: 0,
      warningCount: 1,
      nextDueDate: null,
    },
  ],
}

describe('DashboardSafetyComplianceCard', () => {
  test('shows a skeleton while the deferred prop has not arrived', () => {
    const w = mount(DashboardSafetyComplianceCard, { props: { safetyCompliance: undefined } })
    expect(w.find('[data-testid="dashboard-safety-skeleton"]').exists()).toBe(true)
    expect(w.find('[data-testid="dashboard-safety-summary"]').exists()).toBe(false)
  })

  test('invites to set the armament zone when no boat is checked', () => {
    const w = mount(DashboardSafetyComplianceCard, {
      props: {
        safetyCompliance: { checked: 0, compliant: 0, withIssues: 0, withoutZone: 2, items: [] },
      },
    })
    expect(w.find('[data-testid="dashboard-safety-no-zone"]').exists()).toBe(true)
    expect(w.find('[data-testid="dashboard-safety-summary"]').exists()).toBe(false)
  })

  test('renders the empty state when every checked boat is compliant', () => {
    const w = mount(DashboardSafetyComplianceCard, {
      props: {
        safetyCompliance: { checked: 2, compliant: 2, withIssues: 0, withoutZone: 0, items: [] },
      },
    })
    expect(w.find('[data-testid="dashboard-safety-empty"]').exists()).toBe(true)
    expect(w.get('[data-testid="dashboard-safety-summary"]').text()).toContain(
      'dashboard.safetyCompliance.summary(2,0)'
    )
    expect(w.text()).not.toContain('dashboard.safetyCompliance.withoutZone')
  })

  test('renders one linked row per boat with its gaps, score and next due date', () => {
    const w = mount(DashboardSafetyComplianceCard, { props: { safetyCompliance: report } })
    const rows = w.findAll('[data-testid="dashboard-safety-row"]')
    expect(rows.map((r) => r.attributes('href'))).toEqual([
      '/boats/4?tab=safety',
      '/boats/5?tab=safety',
    ])
    expect(rows[0].text()).toContain('Albatros')
    expect(rows[0].text()).toContain('dashboard.safetyCompliance.blocking(2)')
    expect(rows[0].text()).toContain('dashboard.safetyCompliance.warning(1)')
    expect(rows[0].text()).toContain('dashboard.safetyCompliance.nextDue(d:2026-10-02)')
    expect(rows[0].get('[data-testid="dashboard-safety-score"]').classes()).toContain('text-danger')
    expect(rows[1].get('[data-testid="dashboard-safety-score"]').classes()).toContain(
      'text-warning'
    )
    expect(rows[1].text()).not.toContain('dashboard.safetyCompliance.blocking')
    expect(w.get('[data-testid="dashboard-safety-summary"]').text()).toContain(
      'dashboard.safetyCompliance.withoutZone(1)'
    )
    expect(w.find('[data-testid="dashboard-safety-more"]').exists()).toBe(false)
    expect(w.get('[data-testid="dashboard-safety-view-all"]').attributes('href')).toBe('/boats')
  })

  test('shows the remaining count when more boats have gaps than rows', () => {
    const w = mount(DashboardSafetyComplianceCard, {
      props: { safetyCompliance: { ...report, withIssues: 7 } },
    })
    expect(w.get('[data-testid="dashboard-safety-more"]').text()).toBe(
      'dashboard.safetyCompliance.more(5)'
    )
  })
})
