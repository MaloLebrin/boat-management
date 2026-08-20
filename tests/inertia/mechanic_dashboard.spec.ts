import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

vi.mock('@inertiajs/vue3', () => ({
  Head: { template: '<div><slot /></div>' },
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
