import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import { ref } from 'vue'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatDate: (d: string) => `date(${d})` }),
}))

const pageUrl = ref('/planning')

vi.mock('@inertiajs/vue3', () => ({
  Head: { template: '<div><slot /></div>' },
  router: { visit: vi.fn() },
  usePage: () => ({
    get url() {
      return pageUrl.value
    },
  }),
}))

import PlanningPage from '../../inertia/pages/planning/index.vue'
import PlanningTaskCard from '../../inertia/components/planning/PlanningTaskCard.vue'
import type { PlanningTask } from '../../shared/types/planning'

function task(id: number, overrides: Partial<PlanningTask> = {}): PlanningTask {
  return {
    id,
    boatId: 1,
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

const cardStubs = { BaseButton: { template: '<button><slot /></button>' } }

function mountCard(props: { task: PlanningTask; highlighted?: boolean }) {
  return mount(PlanningTaskCard, { props, global: { stubs: cardStubs } })
}

function mountPlanning(url: string, tasks: PlanningTask[]) {
  pageUrl.value = url
  return mount(PlanningPage, {
    props: {
      tasks,
      overdueTasks: tasks,
      soonTasks: [],
      plannedTasks: [],
      undatedTasks: [],
      doneTasks: [],
      doneTasksTotal: 0,
      groups: [],
      canGroupTasks: false,
    },
    global: {
      stubs: {
        Head: { template: '<div><slot /></div>' },
        BaseButton: { template: '<button><slot /></button>' },
        BaseHeading: { template: '<h1><slot /></h1>' },
        BaseEmptyState: { template: '<div class="empty" />' },
        PlanningCalendar: { template: '<div class="calendar" />' },
      },
    },
  })
}

test('a task card carries a stable DOM id, addressable from outside', () => {
  const w = mountCard({ task: task(42) })
  expect(w.find('#planning-task-42').exists()).toBe(true)
})

test('a card is highlighted only when the highlighted flag is on', () => {
  const plain = mountCard({ task: task(42) })
  expect(plain.classes().join(' ')).not.toContain('ring-brand')

  const highlighted = mountCard({ task: task(42), highlighted: true })
  expect(highlighted.classes().join(' ')).toContain('ring-brand')
})

test('a highlighted card scrolls itself into view on mount', () => {
  const scrollIntoView = vi.fn()
  Element.prototype.scrollIntoView = scrollIntoView

  mountCard({ task: task(42) })
  expect(scrollIntoView).not.toHaveBeenCalled()

  mountCard({ task: task(42), highlighted: true })
  expect(scrollIntoView).toHaveBeenCalledOnce()
})

test('/planning?task=<id> highlights that task and no other (#473)', () => {
  const w = mountPlanning('/planning?task=2', [task(1), task(2), task(3)])
  const cards = w.findAllComponents(PlanningTaskCard)
  expect(cards).toHaveLength(3)
  expect(cards.map((c) => c.props('highlighted'))).toEqual([false, true, false])
})

test('/planning without a task param highlights nothing', () => {
  const w = mountPlanning('/planning', [task(1), task(2)])
  const cards = w.findAllComponents(PlanningTaskCard)
  expect(cards.map((c) => c.props('highlighted'))).toEqual([false, false])
})

test('a non-numeric or out-of-range task param is ignored', () => {
  for (const url of [
    '/planning?task=abc',
    '/planning?task=0',
    '/planning?task=-3',
    '/planning?task=',
  ]) {
    const w = mountPlanning(url, [task(1)])
    const cards = w.findAllComponents(PlanningTaskCard)
    expect(cards.map((c) => c.props('highlighted'))).toEqual([false])
  }
})
