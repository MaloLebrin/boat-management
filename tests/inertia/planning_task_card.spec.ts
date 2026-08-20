import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string) => key,
    locale: { value: 'en' },
  }),
}))

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    usePage: vi.fn(),
  }
})

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: { template: '<button data-boat-link><slot /></button>' },
}))

import { usePage } from '@inertiajs/vue3'
import PlanningTaskCard from '../../inertia/components/planning/PlanningTaskCard.vue'
import type { PlanningTask } from '../../shared/types/planning'
import type { Capability } from '../../shared/types/permissions'

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

function mountCard(task: PlanningTask = baseTask, capabilities: Capability[] = ['boats.view']) {
  vi.mocked(usePage).mockReturnValue({
    props: { permissions: { role: 'member', capabilities } },
  } as ReturnType<typeof usePage>)

  return mount(PlanningTaskCard, { props: { task } })
}

test('renders the translated subject label instead of the raw enum value', () => {
  const w = mountCard()
  expect(w.text()).toContain('maintenance.history.subjects.engine')
})

test('translates other known subjects too', () => {
  const w = mountCard({ ...baseTask, subject: 'rig' })
  expect(w.text()).toContain('maintenance.history.subjects.rig')
})

test('renders the translated task kind label', () => {
  const w = mountCard()
  expect(w.text()).toContain('planning.taskKind.date')
})

test('a user with boats.view gets a link to the boat (#473)', () => {
  const w = mountCard(baseTask, ['boats.view'])
  expect(w.find('[data-boat-link]').exists()).toBe(true)
})

test('a mechanic without boats.view gets no link to the boat (#473)', () => {
  const w = mountCard(baseTask, ['maintenance.view', 'maintenance.create', 'maintenance.edit'])
  expect(w.find('[data-boat-link]').exists()).toBe(false)
})

test('the task kind label stays visible without boats.view (#473)', () => {
  const w = mountCard(baseTask, ['maintenance.view'])
  expect(w.text()).toContain('planning.taskKind.date')
})

test('missing permissions prop hides the boat link rather than exposing a 403 (#473)', () => {
  vi.mocked(usePage).mockReturnValue({ props: {} } as ReturnType<typeof usePage>)
  const w = mount(PlanningTaskCard, { props: { task: baseTask } })
  expect(w.find('[data-boat-link]').exists()).toBe(false)
})
