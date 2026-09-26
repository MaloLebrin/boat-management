import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (k: string, params?: Record<string, string>) =>
      params ? `${k}(${Object.values(params).join(',')})` : k,
    locale: { value: 'fr' },
  }),
}))

vi.mock('~/composables/use_notification_helpers', () => ({
  useNotificationHelpers: () => ({ formatRelativeTime: () => 'il y a 2 h' }),
}))

vi.mock('~/composables/use_number_format', () => ({
  useNumberFormat: () => ({
    formatNumber: (v: number) => String(v),
    formatCurrency: (v: number) => `${v} €`,
  }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

import DashboardActivityCard from '../../inertia/components/dashboard/DashboardActivityCard.vue'
import type { DashboardActivityItem } from '../../shared/types/dashboard'

const items: DashboardActivityItem[] = [
  {
    kind: 'trip_completed',
    key: 'trip:1',
    occurredAt: '2026-09-26T04:00:00.000Z',
    boatId: 4,
    boatName: 'Albatros',
    href: '/boats/4/navigation',
    departurePortName: 'Brest',
    arrivalPortName: 'Camaret',
    distanceNm: 18.5,
  },
  {
    kind: 'task_done',
    key: 'task:2',
    occurredAt: '2026-09-25T00:00:00.000Z',
    boatId: 4,
    boatName: 'Albatros',
    href: '/planning?task=2',
    title: 'Vidange',
    subject: 'engine',
  },
  {
    kind: 'incident_reported',
    key: 'incident:3',
    occurredAt: '2026-09-24T10:00:00.000Z',
    boatId: 5,
    boatName: 'Sirocco',
    href: '/boats/5/incidents/3',
    incidentType: 'engine_failure',
  },
  {
    kind: 'fuel_logged',
    key: 'fuel:4',
    occurredAt: '2026-09-23T10:00:00.000Z',
    boatId: 5,
    boatName: 'Sirocco',
    href: '/navigation/fuel',
    quantityLiters: 40,
    totalCost: 80,
  },
  {
    kind: 'document_added',
    key: 'document:5',
    occurredAt: '2026-09-22T10:00:00.000Z',
    boatId: 5,
    boatName: 'Sirocco',
    href: '/boats/5?tab=documents',
    documentType: 'insurance',
    customTypeLabel: null,
  },
]

describe('DashboardActivityCard (#832)', () => {
  test('shows a skeleton while the deferred prop has not arrived', () => {
    const w = mount(DashboardActivityCard, { props: { items: undefined } })
    expect(w.find('[data-testid="dashboard-activity-skeleton"]').exists()).toBe(true)
    expect(w.findAll('[data-testid="dashboard-activity-row"]').length).toBe(0)
    expect(w.text()).not.toContain('dashboard.activity.empty')
  })

  test('renders the empty state once loaded without events', () => {
    const w = mount(DashboardActivityCard, { props: { items: [] } })
    expect(w.find('[data-testid="dashboard-activity-skeleton"]').exists()).toBe(false)
    expect(w.text()).toContain('dashboard.activity.empty')
  })

  test('renders one linked row per event with its label and relative time', async () => {
    const w = mount(DashboardActivityCard, { props: { items } })
    await w.vm.$nextTick()
    const rows = w.findAll('[data-testid="dashboard-activity-row"]')
    expect(rows.map((r) => r.attributes('href'))).toEqual(items.map((i) => i.href))
    expect(rows.map((r) => r.attributes('data-kind'))).toEqual(items.map((i) => i.kind))
    const text = w.text()
    expect(text).toContain('dashboard.activity.kind.tripCompleted(Brest,Camaret)')
    expect(text).toContain('dashboard.activity.distance(18.5)')
    expect(text).toContain(
      'dashboard.activity.kind.taskDone(Vidange,maintenance.history.subjects.engine)'
    )
    expect(text).toContain(
      'dashboard.activity.kind.incidentReported(incidents.type.engine_failure)'
    )
    expect(text).toContain('dashboard.activity.kind.fuelLogged(40,80 €)')
    expect(text).toContain('dashboard.activity.kind.documentAdded(boats.adminDocs.types.insurance)')
    expect(rows[0].text()).toContain('il y a 2 h')
  })
})
