import { mount } from '@vue/test-utils'
import { test, expect, vi, beforeEach } from 'vitest'

const mockVisit = vi.hoisted(() => vi.fn())

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key, locale: { value: 'fr' } }),
}))

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    usePage: vi.fn(),
    router: { visit: mockVisit },
  }
})

vi.mock('~/components/base/BaseCard.vue', () => ({
  default: { template: '<div><slot name="header" /><slot /></div>' },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button :data-boat-link="route ? \'\' : undefined"><slot /></button>',
    props: ['route', 'params', 'variant', 'size'],
  },
}))

vi.mock('~/components/planning/PlanningCalendarHourTasks.vue', () => ({
  default: { template: '<div />' },
}))

import { usePage } from '@inertiajs/vue3'
import PlanningCalendar from '../../inertia/components/planning/PlanningCalendar.vue'
import type { PlanningTask } from '../../shared/types/planning'
import type { Capability } from '../../shared/types/permissions'

const now = new Date()
const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

const datedTask: PlanningTask = {
  id: 1,
  boatId: 10,
  boatName: 'Test Boat',
  title: 'Change oil',
  subject: 'engine',
  kind: 'date',
  dueAt: todayIso,
  dueEngineHours: null,
  currentEngineHours: null,
  status: 'open',
}

const undatedTask: PlanningTask = { ...datedTask, id: 2, dueAt: null }

const MECHANIC_CAPABILITIES: Capability[] = [
  'maintenance.view',
  'maintenance.create',
  'maintenance.edit',
]

function mountCalendar(tasks: PlanningTask[], capabilities: Capability[]) {
  vi.mocked(usePage).mockReturnValue({
    props: { permissions: { role: 'member', capabilities } },
  } as ReturnType<typeof usePage>)

  return mount(PlanningCalendar, { props: { tasks } })
}

beforeEach(() => {
  mockVisit.mockClear()
})

test('clicking a calendar pill opens the boat when the user has boats.view (#473)', async () => {
  const w = mountCalendar([datedTask], ['boats.view'])

  const pill = w.findAll('div').find((d) => d.classes().includes('cursor-pointer'))
  expect(pill).toBeDefined()
  await pill!.trigger('click')

  expect(mockVisit).toHaveBeenCalledWith('/boats/10')
})

test('a mechanic without boats.view cannot navigate from a calendar pill (#473)', async () => {
  const w = mountCalendar([datedTask], MECHANIC_CAPABILITIES)

  expect(w.findAll('.cursor-pointer')).toHaveLength(0)

  const pill = w.findAll('div').find((d) => d.text() === datedTask.title)
  expect(pill).toBeDefined()
  await pill!.trigger('click')

  expect(mockVisit).not.toHaveBeenCalled()
})

test('the "schedule" button is hidden without boats.view (#473)', () => {
  const allowed = mountCalendar([undatedTask], ['boats.view'])
  expect(allowed.find('[data-boat-link]').exists()).toBe(true)

  const denied = mountCalendar([undatedTask], MECHANIC_CAPABILITIES)
  expect(denied.find('[data-boat-link]').exists()).toBe(false)
  expect(denied.text()).toContain(undatedTask.title)
})
