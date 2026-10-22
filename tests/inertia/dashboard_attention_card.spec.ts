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

vi.mock('~/composables/use_number_format', () => ({
  useNumberFormat: () => ({ formatCurrency: (v: number) => `${v} €` }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

import DashboardAttentionCard from '../../inertia/components/dashboard/DashboardAttentionCard.vue'
import type {
  DashboardAttention,
  DashboardAttentionCounts,
  DashboardAttentionItem,
} from '../../shared/types/dashboard'

const counts = (over: Partial<DashboardAttentionCounts> = {}): DashboardAttentionCounts => ({
  maintenanceOverdue: 0,
  maintenanceSoon: 0,
  incidentsOpen: 0,
  incidentsInProgress: 0,
  documentsExpired: 0,
  documentsExpiring: 0,
  invoicesOverdue: 0,
  instrumentAlerts: 0,
  total: 0,
  ...over,
})

const maintenance: DashboardAttentionItem = {
  kind: 'maintenance',
  key: 'maintenance:1',
  severity: 'danger',
  boatId: 4,
  boatName: 'Albatros',
  date: '2026-09-20',
  href: '/planning?task=1',
  taskId: 1,
  title: 'Vidange',
  subject: 'engine',
  due: 'overdue',
  dueAt: '2026-09-20',
  dueEngineHours: null,
  currentEngineHours: null,
}
const incident: DashboardAttentionItem = {
  kind: 'incident',
  key: 'incident:7',
  severity: 'warning',
  boatId: 4,
  boatName: 'Albatros',
  date: '2026-09-10',
  href: '/boats/4/incidents/7',
  incidentId: 7,
  incidentType: 'engine_failure',
  status: 'in_progress',
  occurredAt: '2026-09-10T08:00:00.000Z',
}
const document: DashboardAttentionItem = {
  kind: 'document',
  key: 'document:3',
  severity: 'danger',
  boatId: 5,
  boatName: 'Cap Mistral',
  date: '2026-09-01',
  href: '/boats/5?tab=documents',
  documentId: 3,
  documentType: 'insurance',
  customTypeLabel: null,
  expiresAt: '2026-09-01',
  status: 'expired',
}
const invoice: DashboardAttentionItem = {
  kind: 'invoice',
  key: 'invoice:9',
  severity: 'danger',
  boatId: 0,
  boatName: 'M. Roux',
  date: '2026-09-15',
  href: '/invoices?status=overdue',
  invoiceId: 9,
  number: 'FAC-000123',
  clientName: 'M. Roux',
  total: 1200,
  dueAt: '2026-09-15',
}

function mountCard(attention: DashboardAttention) {
  return mount(DashboardAttentionCard, { props: { attention } })
}

describe('DashboardAttentionCard (#832)', () => {
  test('renders one whole-row link per item with its kind and destination', () => {
    const w = mountCard({
      items: [maintenance, incident, document, invoice],
      counts: counts({
        maintenanceOverdue: 1,
        incidentsOpen: 1,
        documentsExpired: 1,
        invoicesOverdue: 1,
        instrumentAlerts: 0,
        total: 4,
      }),
      canViewInvoices: true,
    })
    const rows = w.findAll('[data-testid="dashboard-attention-row"]')
    expect(rows.map((r) => r.attributes('href'))).toEqual([
      '/planning?task=1',
      '/boats/4/incidents/7',
      '/boats/5?tab=documents',
      '/invoices?status=overdue',
    ])
    expect(rows.map((r) => r.attributes('data-kind'))).toEqual([
      'maintenance',
      'incident',
      'document',
      'invoice',
    ])
    // Pas de lien imbriqué dans une ligne
    expect(rows.every((r) => r.findAll('a').length === 0)).toBe(true)
  })

  test('labels each kind with its own pill and detail', () => {
    const w = mountCard({
      items: [maintenance, incident, document, invoice],
      counts: counts({ total: 4 }),
      canViewInvoices: true,
    })
    const text = w.text()
    expect(text).toContain('dashboard.attention.kind.overdue')
    expect(text).toContain('dashboard.attention.detail.dueAt(date:2026-09-20)')
    expect(text).toContain('incidents.type.engine_failure')
    expect(text).toContain('dashboard.attention.kind.incidentInProgress')
    expect(text).toContain('boats.adminDocs.types.insurance')
    expect(text).toContain('dashboard.attention.detail.expiredOn(date:2026-09-01)')
    expect(text).toContain('dashboard.attention.detail.invoice(FAC-000123,1200 €)')
    expect(text).toContain('dashboard.attention.kind.invoiceOverdue')
  })

  test('shows per-kind chips with counts and links, hiding empty kinds and invoices without access', () => {
    const w = mountCard({
      items: [maintenance],
      counts: counts({
        maintenanceOverdue: 2,
        maintenanceSoon: 3,
        incidentsOpen: 1,
        invoicesOverdue: 4,
        instrumentAlerts: 0,
        total: 10,
      }),
      canViewInvoices: false,
    })
    const maint = w.get('[data-testid="dashboard-attention-chip-maintenance"]')
    expect(maint.text()).toBe('dashboard.attention.chips.maintenance(5)')
    expect(maint.attributes('href')).toBe('/planning')
    expect(w.get('[data-testid="dashboard-attention-chip-incidents"]').attributes('href')).toBe(
      '/navigation/incidents'
    )
    expect(w.find('[data-testid="dashboard-attention-chip-documents"]').exists()).toBe(false)
    expect(w.find('[data-testid="dashboard-attention-chip-invoices"]').exists()).toBe(false)
  })

  test('the documents chip is a plain counter (no fleet-wide documents page)', () => {
    const w = mountCard({
      items: [document],
      counts: counts({ documentsExpired: 1, documentsExpiring: 2, total: 3 }),
      canViewInvoices: false,
    })
    const chip = w.get('[data-testid="dashboard-attention-chip-documents"]')
    expect(chip.element.tagName).toBe('SPAN')
    expect(chip.text()).toBe('dashboard.attention.chips.documents(3)')
  })

  test('tells how many counted items are not displayed', () => {
    const w = mountCard({
      items: [maintenance],
      counts: counts({ maintenanceOverdue: 9, total: 9 }),
      canViewInvoices: false,
    })
    expect(w.get('[data-testid="dashboard-attention-more"]').text()).toBe(
      'dashboard.attention.more(8)'
    )
    expect(w.text()).toContain('· 9')
  })

  test('renders the empty state and the planning link when there is nothing to handle', () => {
    const w = mountCard({ items: [], counts: counts(), canViewInvoices: false })
    expect(w.text()).toContain('dashboard.attention.empty')
    expect(w.find('[data-testid="dashboard-attention-more"]').exists()).toBe(false)
    expect(w.find('a[href="/planning"]').text()).toContain('dashboard.viewPlanning')
  })

  test('renders an instrument alert row and chip (#993)', () => {
    const item: DashboardAttentionItem = {
      kind: 'instrument',
      key: 'instrument:5',
      severity: 'danger',
      boatId: 4,
      boatName: 'Albatros',
      date: '2026-10-22',
      href: '/boats/4?tab=instruments',
      alertId: 5,
      ruleKey: 'builtin:shallow_water',
      path: 'environment.depth.belowKeel',
      openedAt: '2026-10-22T08:00:00.000Z',
    }
    const custom: DashboardAttentionItem = {
      ...item,
      key: 'instrument:6',
      severity: 'warning',
      alertId: 6,
      ruleKey: 'rule:2',
      path: 'propulsion.port.temperature',
    }
    const w = mountCard({
      items: [item, custom],
      counts: counts({ instrumentAlerts: 2, total: 2 }),
      canViewInvoices: false,
    })

    const rows = w.findAll('[data-testid="dashboard-attention-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].attributes('data-kind')).toBe('instrument')
    expect(rows[0].attributes('href')).toBe('/boats/4?tab=instruments')
    expect(rows[0].text()).toContain('instruments.alerts.builtin.shallow_water')
    expect(rows[0].text()).toContain('dashboard.attention.kind.instrumentAlert')
    expect(rows[1].text()).toContain('propulsion.port.temperature')
    expect(w.find('[data-testid="dashboard-attention-chip-instruments"]').exists()).toBe(true)
  })
})
