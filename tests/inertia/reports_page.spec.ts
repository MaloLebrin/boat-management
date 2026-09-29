import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (k: string, params?: Record<string, string>) =>
      params ? `${k}(${Object.values(params).join(',')})` : k,
    locale: { value: 'fr' },
  }),
}))

vi.mock('~/composables/use_number_format', () => ({
  useNumberFormat: () => ({
    formatNumber: (v: number) => `n:${v}`,
    formatCurrency: (v: number) => `${v} €`,
    formatCurrencyNoDecimals: (v: number) => `${v} €`,
  }),
}))

vi.mock('vue-chartjs', () => ({
  Bar: { template: '<canvas data-test="bar" />' },
  Line: { template: '<canvas data-test="line" />' },
}))

const routerGet = vi.hoisted(() => vi.fn())
vi.mock('@inertiajs/vue3', () => ({
  Head: { template: '<div />' },
  router: { get: routerGet },
  usePage: () => ({ props: { currentPlan: 'starter' } }),
  useForm: () => ({ transform: () => ({ post: vi.fn() }) }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

import ReportsPage from '../../inertia/pages/reports/index.vue'
import ReportFilters from '../../inertia/components/reports/ReportFilters.vue'
import type {
  FleetReport,
  ReportCostBreakdown,
  ReportMetrics,
  ReportsPageProps,
} from '../../shared/types/reporting'

function costs(total: number): ReportCostBreakdown {
  return { maintenance: 0, fuel: total, documents: 0, port: 0, equipment: 0, entries: 0, total }
}

function metrics(overrides: Partial<ReportMetrics> = {}): ReportMetrics {
  return {
    costs: costs(150),
    rentalRevenue: 500,
    invoicedPaid: 300,
    margin: 350,
    rentalDays: 5,
    occupancyRate: 17,
    engineHours: 4,
    distanceNm: 20,
    costPerEngineHour: 37.5,
    costPerRentalDay: 30,
    costPerNauticalMile: 7.5,
    ...overrides,
  }
}

const period = { preset: 'month' as const, from: '2026-06-01', to: '2026-06-30', days: 30 }

const report: FleetReport = {
  period,
  previousPeriod: { ...period, from: '2026-05-01', to: '2026-05-31', days: 31 },
  boatId: null,
  totals: metrics(),
  previousTotals: metrics({ margin: 0, costs: costs(100) }),
  boats: [{ boatId: 3, boatName: 'Albatros', ...metrics({ margin: -20 }) }],
  monthly: [{ month: '2026-06', costs: costs(150), rentalRevenue: 500, occupancyRate: 17 }],
  plannedMaintenance: {
    year: 2026,
    quarter: 2,
    amount: 80,
    estimatedCount: 1,
    unestimatedCount: 2,
  },
}

function props(overrides: Partial<ReportsPageProps> = {}): ReportsPageProps {
  return {
    locked: false,
    report,
    boats: [{ id: 3, name: 'Albatros' }],
    query: { preset: 'month', from: null, to: null, boatId: null },
    charterEnabled: true,
    invoicingEnabled: true,
    canExport: true,
    ...overrides,
  }
}

const stubs = { UpgradePlanModal: { template: '<div data-test="upgrade-modal" />' } }

describe('Reporting page (#887)', () => {
  beforeEach(() => routerGet.mockReset())

  test('renders KPIs, charts and the per-boat table with the fleet total', () => {
    const w = mount(ReportsPage, { props: props(), global: { stubs } })

    expect(w.find('[data-test="report-locked"]').exists()).toBe(false)
    expect(w.find('[data-test="kpi-margin"]').text()).toContain('350 €')
    expect(w.find('[data-test="kpi-costs"]').text()).toContain('reports.kpi.delta(+50)')
    // Marge précédente nulle : pas de pourcentage inventé.
    expect(w.find('[data-test="kpi-margin"]').text()).toContain('reports.kpi.noDelta')
    expect(w.find('[data-test="kpi-plannedMaintenance"]').text()).toContain(
      'reports.kpi.unestimated(2)'
    )
    expect(w.findAll('[data-test="bar"]')).toHaveLength(2)
    expect(w.findAll('[data-test="line"]')).toHaveLength(1)
    const rows = w.findAll('[data-test="report-table"] tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Albatros')
    expect(rows[0]!.find('.text-danger').text()).toBe('-20 €')
    expect(rows[1]!.text()).toContain('reports.table.fleetTotal')
    expect(w.find('[data-test="report-export"]').attributes('href')).toBe(
      '/reports/export.csv?period=month'
    )
  })

  test('without the charter module, revenue, margin and occupancy are hidden', () => {
    const w = mount(ReportsPage, {
      props: props({ charterEnabled: false, invoicingEnabled: false }),
      global: { stubs },
    })

    expect(w.find('[data-test="kpi-margin"]').exists()).toBe(false)
    expect(w.find('[data-test="kpi-occupancy"]').exists()).toBe(false)
    expect(w.find('[data-test="kpi-invoicedPaid"]').exists()).toBe(false)
    expect(w.findAll('[data-test="line"]')).toHaveLength(0)
    expect(w.text()).toContain('reports.notes.noCharter')
    expect(w.text()).not.toContain('reports.table.revenue')
  })

  test('a Starter account sees the locked preview, no filters and no figures', async () => {
    const w = mount(ReportsPage, {
      props: props({ locked: true, report: null, canExport: false }),
      global: { stubs },
    })

    expect(w.find('[data-test="report-locked"]').exists()).toBe(true)
    expect(w.find('[data-test="report-filters"]').exists()).toBe(false)
    expect(w.find('[data-test="report-kpis"]').exists()).toBe(false)
    expect(w.text()).toContain('reports.locked.title')
  })
})

describe('ReportFilters (#887)', () => {
  beforeEach(() => routerGet.mockReset())

  test('a preset change reloads the page, a custom range waits for « Apply »', async () => {
    const w = mount(ReportFilters, {
      props: {
        query: { preset: 'month', boatId: null },
        period,
        boats: [{ id: 3, name: 'Albatros' }],
        canExport: false,
      },
    })

    const [periodSelect] = w.findAll('select')
    await periodSelect!.setValue('year')
    expect(routerGet).toHaveBeenLastCalledWith(
      '/reports',
      { period: 'year' },
      { preserveScroll: true, preserveState: true }
    )

    routerGet.mockReset()
    await periodSelect!.setValue('custom')
    expect(routerGet).not.toHaveBeenCalled()
    await w.find('[data-test="report-apply"]').trigger('click')
    expect(routerGet).toHaveBeenCalledWith(
      '/reports',
      { period: 'custom', from: '2026-06-01', to: '2026-06-30' },
      { preserveScroll: true, preserveState: true }
    )
    expect(w.find('[data-test="report-export"]').exists()).toBe(false)
  })

  test('the boat filter goes into the query and the export link', async () => {
    const w = mount(ReportFilters, {
      props: {
        query: { preset: 'month', boatId: null },
        period,
        boats: [{ id: 3, name: 'Albatros' }],
        canExport: true,
      },
    })

    const selects = w.findAll('select')
    await selects[selects.length - 1]!.setValue('3')
    expect(routerGet).toHaveBeenLastCalledWith(
      '/reports',
      { period: 'month', boat: '3' },
      { preserveScroll: true, preserveState: true }
    )
    expect(w.find('[data-test="report-export"]').attributes('href')).toBe(
      '/reports/export.csv?period=month&boat=3'
    )
  })
})
