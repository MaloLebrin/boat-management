import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { nextTick } from 'vue'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
    locale: { value: 'en' },
  }),
}))

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    usePage: vi.fn(),
    router: { patch: vi.fn() },
  }
})

vi.mock('@adonisjs/inertia/vue', () => ({
  Form: {
    props: ['action'],
    template:
      '<form :data-url="action.url" :data-method="action.method"><slot :processing="false" :errors="{}" /></form>',
  },
}))

vi.mock('~/components/base/BaseModal.vue', () => ({
  default: {
    props: ['open', 'title'],
    template: '<div v-if="open" data-modal><slot /></div>',
  },
}))

import { router, usePage } from '@inertiajs/vue3'
import BoatMaintenanceTaskEditModal from '../../inertia/components/boats/maintenance/BoatMaintenanceTaskEditModal.vue'
import BoatTaskActions from '../../inertia/components/boats/maintenance/BoatTaskActions.vue'
import MaintenanceTaskPostponeMenu from '../../inertia/components/boats/maintenance/MaintenanceTaskPostponeMenu.vue'
import PlanningTaskCard from '../../inertia/components/planning/PlanningTaskCard.vue'
import type { MaintenanceTaskRow } from '../../inertia/types/boat_show'
import type { Capability } from '../../shared/types/permissions'
import type { PlanningTask } from '../../shared/types/planning'

// Échéance lointaine : le report part de l'échéance, pas d'aujourd'hui.
const FUTURE_DUE = '2099-01-10'

const task: MaintenanceTaskRow = {
  id: 3,
  subject: 'boat',
  title: 'Antifouling',
  notes: 'Coque complète',
  status: 'open',
  dueAt: FUTURE_DUE,
  dueEngineHours: null,
  boatEngineId: null,
  boatSailId: null,
  boatRigId: null,
  boatSafetyEquipmentId: null,
  boatGenericEquipmentId: null,
  recurrenceIntervalMonths: 12,
  recurrenceIntervalEngineHours: null,
  boatIncidentId: null,
}

beforeEach(() => {
  vi.mocked(router.patch).mockClear()
})

describe('MaintenanceTaskPostponeMenu (#867)', () => {
  async function openMenu() {
    const w = mount(MaintenanceTaskPostponeMenu, {
      props: { boatId: 7, taskId: 3, dueAt: FUTURE_DUE },
      attachTo: document.body,
    })
    await w.find('button[aria-expanded]').trigger('click')
    return w
  }

  test('« +1 week » PATCHes only the new due date on the task', async () => {
    const w = await openMenu()
    const week = w.findAll('button[role="menuitem"]')[0]
    expect(week.text()).toBe('boats.maintenance.tasks.postpone.week')

    await week.trigger('click')

    expect(router.patch).toHaveBeenCalledWith(
      '/boats/7/maintenance-tasks/3',
      { dueAt: '2099-01-17' },
      expect.objectContaining({ preserveScroll: true })
    )
    w.unmount()
  })

  test('« +1 month » moves the due date one calendar month later', async () => {
    const w = await openMenu()
    await w.findAll('button[role="menuitem"]')[1].trigger('click')

    expect(vi.mocked(router.patch).mock.calls[0][1]).toEqual({ dueAt: '2099-02-10' })
    w.unmount()
  })

  test('a free date is sent as is, and cannot precede the current due date', async () => {
    const w = await openMenu()
    const input = w.find('input[type="date"]')
    expect(input.attributes('min')).toBe(FUTURE_DUE)

    await input.setValue('2099-03-01')
    await w.find('form').trigger('submit')

    expect(vi.mocked(router.patch).mock.calls[0][1]).toEqual({ dueAt: '2099-03-01' })
    w.unmount()
  })
})

describe('BoatMaintenanceTaskEditModal (#867)', () => {
  test('PATCHes the task with its current values prefilled', () => {
    const w = mount(BoatMaintenanceTaskEditModal, { props: { boatId: 7, task, open: true } })

    const form = w.find('form')
    expect(form.attributes('data-url')).toBe('/boats/7/maintenance-tasks/3')
    expect(form.attributes('data-method')).toBe('patch')

    const value = (name: string) => (w.find(`[name="${name}"]`).element as HTMLInputElement).value
    expect(value('title')).toBe('Antifouling')
    expect(value('dueAt')).toBe(FUTURE_DUE)
    expect(value('recurrenceIntervalMonths')).toBe('12')
    expect(value('notes')).toBe('Coque complète')
  })

  test('engine-hour fields only appear on an engine task', () => {
    const boatTask = mount(BoatMaintenanceTaskEditModal, { props: { boatId: 7, task, open: true } })
    expect(boatTask.find('[name="dueEngineHours"]').exists()).toBe(false)

    const engineTask = mount(BoatMaintenanceTaskEditModal, {
      props: {
        boatId: 7,
        task: { ...task, subject: 'engine', boatEngineId: 5, dueEngineHours: 500 },
        open: true,
      },
    })
    expect((engineTask.find('[name="dueEngineHours"]').element as HTMLInputElement).value).toBe(
      '500'
    )
    expect(engineTask.find('[name="recurrenceIntervalEngineHours"]').exists()).toBe(true)
  })

  test('warns that a new recurrence interval only applies to later occurrences', () => {
    const w = mount(BoatMaintenanceTaskEditModal, { props: { boatId: 7, task, open: true } })
    expect(w.text()).toContain('boats.maintenance.tasks.edit.recurrenceHint')

    const once = mount(BoatMaintenanceTaskEditModal, {
      props: { boatId: 7, task: { ...task, recurrenceIntervalMonths: null }, open: true },
    })
    expect(once.text()).not.toContain('boats.maintenance.tasks.edit.recurrenceHint')
  })
})

describe('BoatTaskActions — edit and postpone (#867)', () => {
  test('an open dated task offers postpone and edit', async () => {
    const w = mount(BoatTaskActions, { props: { boatId: 7, task } })
    expect(w.text()).toContain('boats.maintenance.tasks.postpone.label')

    const edit = w.find('button[aria-label="boats.maintenance.tasks.edit.open"]')
    expect(edit.exists()).toBe(true)
    expect(w.find('[data-modal]').exists()).toBe(false)

    await edit.trigger('click')
    await nextTick()
    expect(w.find('[data-modal]').exists()).toBe(true)
  })

  test('an undated task can be edited but not postponed', () => {
    const w = mount(BoatTaskActions, { props: { boatId: 7, task: { ...task, dueAt: null } } })
    expect(w.text()).not.toContain('boats.maintenance.tasks.postpone.label')
    expect(w.find('button[aria-label="boats.maintenance.tasks.edit.open"]').exists()).toBe(true)
  })

  test('a completed task is history: neither postpone nor edit', () => {
    const w = mount(BoatTaskActions, { props: { boatId: 7, task: { ...task, status: 'done' } } })
    expect(w.text()).not.toContain('boats.maintenance.tasks.postpone.label')
    expect(w.find('button[aria-label="boats.maintenance.tasks.edit.open"]').exists()).toBe(false)
  })
})

describe('PlanningTaskCard — postpone (#867)', () => {
  const planningTask: PlanningTask = {
    id: 3,
    boatId: 7,
    boatName: 'Hélios',
    title: 'Antifouling',
    subject: 'boat',
    kind: 'date',
    dueAt: FUTURE_DUE,
    dueEngineHours: null,
    currentEngineHours: null,
    status: 'open',
    postponedCount: 0,
  }

  function mountCard(t: PlanningTask, capabilities: Capability[], done = false) {
    vi.mocked(usePage).mockReturnValue({
      props: { permissions: { role: 'member', capabilities } },
    } as unknown as ReturnType<typeof usePage>)
    return mount(PlanningTaskCard, { props: { task: t, done } })
  }

  test('offers the postpone menu to a role with maintenance.edit', () => {
    const w = mountCard(planningTask, ['maintenance.edit'])
    expect(w.text()).toContain('boats.maintenance.tasks.postpone.label')
  })

  test('hides it without maintenance.edit, on a done task or on an engine-hour task', () => {
    expect(mountCard(planningTask, ['maintenance.view']).text()).not.toContain(
      'boats.maintenance.tasks.postpone.label'
    )
    expect(mountCard(planningTask, ['maintenance.edit'], true).text()).not.toContain(
      'boats.maintenance.tasks.postpone.label'
    )
    expect(
      mountCard({ ...planningTask, kind: 'hours', dueAt: null, dueEngineHours: 500 }, [
        'maintenance.edit',
      ]).text()
    ).not.toContain('boats.maintenance.tasks.postpone.label')
  })

  test('shows how many times the task was postponed', () => {
    expect(mountCard(planningTask, []).text()).not.toContain('planning.postponedCount')
    expect(mountCard({ ...planningTask, postponedCount: 3 }, []).text()).toContain(
      'planning.postponedCount:{"count":"3"}'
    )
  })
})
