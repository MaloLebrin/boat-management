import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import PlanningTaskCard from '../../inertia/components/planning/PlanningTaskCard.vue'
import type { PlanningTask } from '../../shared/types/planning'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string) => key,
    locale: { value: 'en' },
  }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: { template: '<button><slot /></button>' },
}))

const baseTask: PlanningTask = {
  id: 1,
  boatId: 10,
  boatName: 'Test Boat',
  title: 'Change oil',
  subject: 'engine',
  kind: 'date',
  dueAt: '2026-08-01',
  dueEngineHours: null,
  currentEngineHours: null,
  status: 'open',
}

test('renders the translated subject label instead of the raw enum value', () => {
  const w = mount(PlanningTaskCard, { props: { task: baseTask } })
  expect(w.text()).toContain('maintenance.history.subjects.engine')
})

test('translates other known subjects too', () => {
  const w = mount(PlanningTaskCard, { props: { task: { ...baseTask, subject: 'rig' } } })
  expect(w.text()).toContain('maintenance.history.subjects.rig')
})

test('renders the translated task kind label', () => {
  const w = mount(PlanningTaskCard, { props: { task: baseTask } })
  expect(w.text()).toContain('planning.taskKind.date')
})
