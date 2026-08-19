import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key, locale: { value: 'fr' } }),
}))

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    Head: { template: '<div />' },
    usePage: vi.fn(),
    router: { visit: vi.fn() },
  }
})

vi.mock('~/components/planning/PlanningKanban.vue', () => ({ default: { template: '<div />' } }))
vi.mock('~/components/planning/PlanningCalendar.vue', () => ({ default: { template: '<div />' } }))

import { usePage } from '@inertiajs/vue3'
import PlanningIndex from '../../inertia/pages/planning/index.vue'
import type { Capability } from '../../shared/types/permissions'

function mountEmptyPlanning(capabilities: Capability[]) {
  vi.mocked(usePage).mockReturnValue({
    props: { permissions: { role: 'member', capabilities } },
  } as ReturnType<typeof usePage>)

  return mount(PlanningIndex, {
    props: {
      tasks: [],
      overdueTasks: [],
      soonTasks: [],
      plannedTasks: [],
      undatedTasks: [],
      doneTasks: [],
      doneTasksTotal: 0,
      groups: [],
      canGroupTasks: false,
    },
  })
}

test('the empty state offers the boats shortcut when the user has boats.view (#473)', () => {
  const w = mountEmptyPlanning(['boats.view'])
  expect(w.text()).toContain('planning.empty.action')
})

test('a mechanic without boats.view gets no shortcut to /boats (#473)', () => {
  const w = mountEmptyPlanning(['maintenance.view', 'maintenance.create', 'maintenance.edit'])
  expect(w.text()).toContain('planning.empty.title')
  expect(w.text()).not.toContain('planning.empty.action')
})
