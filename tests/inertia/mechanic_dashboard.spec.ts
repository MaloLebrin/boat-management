import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

vi.mock('@inertiajs/vue3', () => ({
  Head: { template: '<div><slot /></div>' },
  usePage: () => ({ props: { user: { id: 42 } } }),
}))

import MechanicDashboard from '../../inertia/pages/dashboard/mechanic.vue'
import type { PlanningTask } from '../../shared/types/planning'

function task(id: number, overrides: Partial<PlanningTask> = {}): PlanningTask {
  return {
    id,
    boatId: 1,
    boatName: 'Serenity',
    title: 'Vidange',
    subject: 'engine',
    kind: 'date',
    dueAt: '2026-07-30',
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
    ...overrides,
  }
}

const stubs = {
  Head: { template: '<div><slot /></div>' },
  BaseAlert: { template: '<div class="alert"><slot /></div>' },
  BaseCard: { template: '<div><slot name="header" /><slot /></div>' },
  BaseStatCard: {
    props: ['label', 'value'],
    template: '<div class="stat">{{ label }}:{{ value }}</div>',
  },
  BaseButton: {
    props: ['route'],
    template: '<a :data-route="route"><slot /></a>',
  },
  MechanicInterventionRow: {
    props: ['task', 'tone'],
    template: '<li class="row" :data-tone="tone">{{ task.title }}</li>',
  },
}

function mountDashboard(props: { overdueTasks: PlanningTask[]; soonTasks: PlanningTask[] }) {
  return mount(MechanicDashboard, { props, global: { stubs } })
}

test('renders overdue and upcoming counts', () => {
  const w = mountDashboard({
    overdueTasks: [task(1), task(2)],
    soonTasks: [task(3)],
  })
  const stats = w.findAll('.stat').map((s) => s.text())
  expect(stats).toContain('dashboard.mechanic.stats.overdue:2')
  expect(stats).toContain('dashboard.mechanic.stats.upcoming:1')
})

test('renders one intervention row per task, tagged by tone', () => {
  const w = mountDashboard({
    overdueTasks: [task(1)],
    soonTasks: [task(2), task(3)],
  })
  const rows = w.findAll('.row')
  expect(rows).toHaveLength(3)
  expect(w.findAll('[data-tone="overdue"]')).toHaveLength(1)
  expect(w.findAll('[data-tone="soon"]')).toHaveLength(2)
})

test('shows the overdue alert only when there are overdue interventions', () => {
  const withOverdue = mountDashboard({ overdueTasks: [task(1)], soonTasks: [] })
  expect(withOverdue.find('.alert').exists()).toBe(true)

  const withoutOverdue = mountDashboard({ overdueTasks: [], soonTasks: [task(2)] })
  expect(withoutOverdue.find('.alert').exists()).toBe(false)
})

test('shows empty states when there is nothing to do', () => {
  const w = mountDashboard({ overdueTasks: [], soonTasks: [] })
  expect(w.text()).toContain('dashboard.mechanic.overdueEmpty')
  expect(w.text()).toContain('dashboard.mechanic.upcomingEmpty')
  expect(w.findAll('.row')).toHaveLength(0)
})

test('links to the planning and the maintenance history, not to boats', () => {
  const w = mountDashboard({ overdueTasks: [], soonTasks: [] })
  const routes = w.findAll('a').map((a) => a.attributes('data-route'))
  expect(routes).toContain('planning.index')
  expect(routes).toContain('maintenance.history')
  expect(routes).not.toContain('boats.show')
})

test('« Mes tâches » (#868) : opens on the tasks assigned to me when there are some', async () => {
  const me = { id: 42, fullName: 'Moi' }
  const other = { id: 7, fullName: 'Autre' }
  const w = mountDashboard({
    overdueTasks: [task(1, { assignee: me }), task(2, { assignee: other })],
    soonTasks: [task(3), task(4, { assignee: me })],
  })
  expect(w.findAll('.row').map((r) => r.text())).toHaveLength(2)
  expect(w.findAll('.stat').map((s) => s.text())).toContain('dashboard.mechanic.stats.overdue:1')

  const allButton = w.findAll('button').find((b) => b.text() === 'dashboard.mechanic.scope.all')!
  await allButton.trigger('click')
  expect(w.findAll('.row')).toHaveLength(4)
})

test('« Mes tâches » (#868) : without assignment, the whole fleet stays the default', () => {
  const w = mountDashboard({ overdueTasks: [task(1)], soonTasks: [task(2)] })
  expect(w.findAll('.row')).toHaveLength(2)
  const pressed = w.find('button[aria-pressed="true"]')
  expect(pressed.text()).toBe('dashboard.mechanic.scope.all')
})
