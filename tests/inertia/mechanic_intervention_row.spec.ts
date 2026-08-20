import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (k: string, params?: Record<string, string>) =>
      params ? `${k}:${Object.values(params).join('|')}` : k,
    locale: { value: 'fr' },
  }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatDate: (d: string) => `date(${d})` }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    name: 'MockInertiaLink',
    props: { href: { type: String, required: false } },
    template: '<a :href="href"><slot /></a>',
  },
}))

import MechanicInterventionRow from '../../inertia/components/dashboard/MechanicInterventionRow.vue'
import type { PlanningTask } from '../../shared/types/planning'

function task(overrides: Partial<PlanningTask> = {}): PlanningTask {
  return {
    id: 42,
    boatId: 7,
    boatName: 'Sun Odyssey 35',
    title: 'Vidange moteur',
    subject: 'engine',
    kind: 'date',
    dueAt: '2026-07-30',
    dueEngineHours: null,
    currentEngineHours: null,
    status: 'open',
    ...overrides,
  }
}

function mountRow(props: Partial<{ task: PlanningTask; tone: 'overdue' | 'soon' }> = {}) {
  return mount(MechanicInterventionRow, {
    props: { task: task(), tone: 'overdue', ...props },
  })
}

test('the whole card is a link to the planning, centred on the task (#473)', () => {
  const link = mountRow().find('a')
  expect(link.exists()).toBe(true)
  expect(link.attributes('href')).toBe('/planning?task=42')
})

test('the link never points at the boat sheet, forbidden to mechanics', () => {
  const hrefs = mountRow()
    .findAll('a')
    .map((a) => a.attributes('href'))
  expect(hrefs).not.toContain('/boats/7')
  expect(hrefs.every((href) => !href?.startsWith('/boats'))).toBe(true)
})

test('the link carries an accessible name naming the task and the boat', () => {
  const link = mountRow().find('a')
  expect(link.attributes('aria-label')).toBe(
    'dashboard.mechanic.openTask:Vidange moteur|Sun Odyssey 35'
  )
})

test('renders the boat, the title and the overdue badge', () => {
  const w = mountRow({ tone: 'overdue' })
  expect(w.text()).toContain('Sun Odyssey 35')
  expect(w.text()).toContain('Vidange moteur')
  expect(w.text()).toContain('dashboard.mechanic.overdue')
  expect(w.text()).not.toContain('dashboard.mechanic.dueSoon')
})

test('renders the due-soon badge for the soon tone', () => {
  const w = mountRow({ tone: 'soon' })
  expect(w.text()).toContain('dashboard.mechanic.dueSoon')
})

test('renders the due date for a date-based task', () => {
  expect(mountRow().text()).toContain('dashboard.mechanic.dueAt:date(2026-07-30)')
})

test('renders engine hours for an hours-based task', () => {
  const w = mountRow({
    task: task({ kind: 'hours', dueAt: null, dueEngineHours: 250, currentEngineHours: 230 }),
  })
  expect(w.text()).toContain('dashboard.mechanic.dueAtHours:250|230')
})
