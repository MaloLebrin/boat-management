import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
    locale: { value: 'en' },
  }),
}))

vi.mock('~/composables/use_number_format', () => ({
  useNumberFormat: () => ({ formatCurrency: (v: number) => `€${v}` }),
}))

const pageProps: { props: Record<string, unknown> } = { props: {} }
vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return { ...actual, usePage: () => pageProps, router: { patch: vi.fn() } }
})

vi.mock('@adonisjs/inertia/vue', () => ({
  Form: {
    props: ['action'],
    template: '<form><slot :processing="false" :errors="{}" /></form>',
  },
}))

import MaintenanceWorkOrderFields from '../../inertia/components/boats/maintenance/MaintenanceWorkOrderFields.vue'
import MaintenanceTaskWorkOrderSummary from '../../inertia/components/boats/maintenance/MaintenanceTaskWorkOrderSummary.vue'
import BoatTaskActions from '../../inertia/components/boats/maintenance/BoatTaskActions.vue'
import PlannedMaintenanceSummary from '../../inertia/components/boats/budget/PlannedMaintenanceSummary.vue'
import PlanningTaskCard from '../../inertia/components/planning/PlanningTaskCard.vue'
import {
  matchesAssigneeFilter,
  parseAssigneeFilter,
} from '../../inertia/utils/task_assignee_filter'
import { initialsOf } from '../../shared/helpers/full_name'
import type { MaintenanceTaskRow } from '../../inertia/types/boat_show'
import type { PlanningTask } from '../../shared/types/planning'

const jeanne = { id: 5, fullName: 'Jeanne Martin' }

beforeEach(() => {
  pageProps.props = {}
})

describe('MaintenanceWorkOrderFields (#868)', () => {
  test('offers the assignable members, with a « nobody » option, prefilled', () => {
    pageProps.props = {
      maintenanceAssignees: [jeanne, { id: 9, fullName: 'Paul' }],
    }
    const w = mount(MaintenanceWorkOrderFields, {
      props: {
        idPrefix: 'edit',
        initial: {
          assignee: jeanne,
          providerName: 'Chantier',
          estimatedCost: 850.5,
          estimatedDurationMinutes: 240,
        },
      },
    })

    const select = w.find('select[name="assigneeId"]')
    expect((select.element as HTMLSelectElement).value).toBe('5')
    const options = select.findAll('option').map((o) => o.text())
    expect(options).toEqual([
      'boats.maintenance.tasks.workOrder.unassigned',
      'Jeanne Martin',
      'Paul',
    ])
    const value = (name: string) => (w.find(`[name="${name}"]`).element as HTMLInputElement).value
    expect(value('providerName')).toBe('Chantier')
    expect(value('estimatedCost')).toBe('850.5')
    expect(value('estimatedDurationMinutes')).toBe('240')
  })

  test('has no assignee selector on a page that does not provide the members', () => {
    const w = mount(MaintenanceWorkOrderFields, { props: { idPrefix: 'new' } })
    expect(w.find('select[name="assigneeId"]').exists()).toBe(false)
    expect(w.find('[name="providerName"]').exists()).toBe(true)
  })

  test('keeps a former member as an option rather than silently unassigning', () => {
    pageProps.props = { maintenanceAssignees: [{ id: 9, fullName: 'Paul' }] }
    const w = mount(MaintenanceWorkOrderFields, {
      props: { idPrefix: 'edit', initial: { assignee: jeanne } },
    })
    const select = w.find('select[name="assigneeId"]')
    expect((select.element as HTMLSelectElement).value).toBe('5')
  })
})

describe('MaintenanceTaskWorkOrderSummary (#868)', () => {
  test('summarises assignee, provider and estimate on one line', () => {
    const w = mount(MaintenanceTaskWorkOrderSummary, {
      props: { workOrder: { assignee: jeanne, providerName: 'Voilerie', estimatedCost: 120 } },
    })
    expect(w.text()).toBe(
      'boats.maintenance.tasks.workOrder.assignedTo:{"name":"Jeanne Martin"} · ' +
        'boats.maintenance.tasks.workOrder.providerShort:{"name":"Voilerie"} · ' +
        'boats.maintenance.tasks.workOrder.estimatedShort:{"amount":"€120"}'
    )
  })

  test('renders nothing without a work order', () => {
    const w = mount(MaintenanceTaskWorkOrderSummary, {
      props: { workOrder: { assignee: null, providerName: null, estimatedCost: null } },
    })
    expect(w.find('[data-testid="task-work-order"]').exists()).toBe(false)
  })
})

describe('BoatTaskActions — actuals on close (#868)', () => {
  const task: MaintenanceTaskRow = {
    id: 3,
    subject: 'boat',
    title: 'Antifouling',
    notes: null,
    status: 'open',
    dueAt: null,
    dueEngineHours: null,
    boatEngineId: null,
    boatSailId: null,
    boatRigId: null,
    boatSafetyEquipmentId: null,
    boatGenericEquipmentId: null,
    recurrenceIntervalMonths: null,
    recurrenceIntervalEngineHours: null,
    boatIncidentId: null,
  }

  test('asks the actual cost and time when the task has an estimate', () => {
    const w = mount(BoatTaskActions, {
      props: { boatId: 7, task: { ...task, estimatedCost: 800 } },
    })
    expect(w.find('[name="actualCost"]').exists()).toBe(true)
    expect(w.find('[name="actualDurationMinutes"]').exists()).toBe(true)
  })

  test('keeps the one-click close without an estimate', () => {
    const w = mount(BoatTaskActions, { props: { boatId: 7, task } })
    expect(w.find('[name="actualCost"]').exists()).toBe(false)
  })
})

describe('PlannedMaintenanceSummary (#868)', () => {
  test('shows the quarter, the amount and the tasks left without an estimate', () => {
    const w = mount(PlannedMaintenanceSummary, {
      props: {
        summary: { year: 2026, quarter: 3, amount: 500.5, estimatedCount: 2, unestimatedCount: 1 },
      },
    })
    expect(w.text()).toContain('budget.plannedMaintenance.title:{"quarter":"3","year":"2026"}')
    expect(w.get('[data-testid="planned-maintenance-amount"]').text()).toBe('€500.5')
    expect(w.get('[data-testid="planned-maintenance-unestimated"]').text()).toContain(
      '{"count":"1"}'
    )
  })
})

describe('PlanningTaskCard — assignee (#868)', () => {
  const planningTask: PlanningTask = {
    id: 3,
    boatId: 7,
    boatName: 'Hélios',
    title: 'Antifouling',
    subject: 'boat',
    kind: 'date',
    dueAt: '2099-01-10',
    dueEngineHours: null,
    currentEngineHours: null,
    status: 'open',
    postponedCount: 0,
    assignee: null,
    providerName: null,
    estimatedCost: null,
    actualCost: null,
    estimatedDurationMinutes: null,
    actualDurationMinutes: null,
  }

  test('shows the assignee initials, with the full name for assistive tech', () => {
    pageProps.props = { permissions: { role: 'member', capabilities: [] } }
    const w = mount(PlanningTaskCard, {
      props: { task: { ...planningTask, assignee: jeanne, providerName: 'Voilerie' } },
    })
    const badge = w.get('[data-testid="planning-task-assignee"]')
    expect(badge.text()).toBe('JM')
    expect(badge.attributes('aria-label')).toBe('planning.assignedTo:{"name":"Jeanne Martin"}')
    expect(w.text()).toContain('Voilerie')
  })

  test('no badge on an unassigned task', () => {
    pageProps.props = { permissions: { role: 'member', capabilities: [] } }
    const w = mount(PlanningTaskCard, { props: { task: planningTask } })
    expect(w.find('[data-testid="planning-task-assignee"]').exists()).toBe(false)
  })
})

describe('assignee filter (#868)', () => {
  const mine = { assignee: { id: 1, fullName: 'Moi' } }
  const theirs = { assignee: { id: 2, fullName: 'Autre' } }
  const nobody = { assignee: null }

  test('matches all, mine, unassigned or a given member', () => {
    const tasks = [mine, theirs, nobody]
    const keep = (filter: Parameters<typeof matchesAssigneeFilter>[1]) =>
      tasks.filter((t) => matchesAssigneeFilter(t, filter, 1))
    expect(keep('all')).toEqual(tasks)
    expect(keep('mine')).toEqual([mine])
    expect(keep('unassigned')).toEqual([nobody])
    expect(keep(2)).toEqual([theirs])
  })

  test('« mine » matches nothing for an anonymous page', () => {
    expect(matchesAssigneeFilter(mine, 'mine', null)).toBe(false)
  })

  test('parses the select value back to a typed filter', () => {
    expect(parseAssigneeFilter('mine')).toBe('mine')
    expect(parseAssigneeFilter('12')).toBe(12)
    expect(parseAssigneeFilter('nope')).toBe('all')
  })

  test('initials take the first and last names', () => {
    expect(initialsOf('Jeanne Martin')).toBe('JM')
    expect(initialsOf('jean paul  gaultier')).toBe('JG')
    expect(initialsOf('Paul')).toBe('P')
  })
})
