import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({
    formatDate: (d: string) => `date(${d})`,
    formatDayMonth: (d: string) => `dm(${d.slice(0, 10)})`,
  }),
}))

vi.mock('~/utils/local_datetime', () => ({ todayDateInputValue: () => '2026-09-28' }))

const patch = vi.fn()
vi.mock('@inertiajs/vue3', () => ({
  router: { patch: (...args: unknown[]) => patch(...args), visit: vi.fn() },
  usePage: () => ({
    props: {
      permissions: { role: 'admin', capabilities: ['boats.view', 'maintenance.edit'] },
    },
  }),
}))

import PlanningKanban from '../../inertia/components/planning/PlanningKanban.vue'
import { usePlanningReschedule } from '../../inertia/composables/use_planning_reschedule'
import type { PlanningReservation, PlanningTask } from '../../shared/types/planning'

function task(id: number, overrides: Partial<PlanningTask> = {}): PlanningTask {
  return {
    id,
    boatId: 1,
    boatName: 'Sun Odyssey 35',
    title: `Tâche ${id}`,
    subject: 'engine',
    kind: 'date',
    dueAt: '2026-10-01',
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

const confirmed: PlanningReservation = {
  id: 9,
  boatId: 1,
  boatName: 'Sun Odyssey 35',
  status: 'confirmed',
  startsAt: '2026-10-28T08:00:00.000Z',
  endsAt: '2026-11-02T18:00:00.000Z',
  clientName: 'Durand',
}

function mountKanban(props: Record<string, unknown> = {}) {
  return mount(PlanningKanban, {
    attachTo: document.body,
    props: {
      overdueTasks: [],
      soonTasks: [task(1)],
      plannedTasks: [],
      undatedTasks: [task(2, { dueAt: null })],
      doneTasks: [],
      doneTasksTotal: 0,
      groups: [],
      groupingEnabled: false,
      dismissedGroupIds: new Set<string>(),
      canReschedule: true,
      ...props,
    },
    global: {
      stubs: {
        BaseButton: { template: '<button><slot /></button>' },
        MaintenanceTaskPostponeMenu: true,
      },
    },
  })
}

function pointer(type: string, x: number, y: number) {
  const event = new MouseEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true })
  window.dispatchEvent(event)
}

describe('kanban drag & drop (#869)', () => {
  let elementFromPoint: ReturnType<typeof vi.fn>

  beforeEach(() => {
    elementFromPoint = vi.fn()
    document.elementFromPoint = elementFromPoint as unknown as typeof document.elementFromPoint
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  test('glisser une carte sur « Planifiées » lui donne l’échéance de la colonne', async () => {
    const wrapper = mountKanban()
    const card = wrapper.find('[data-testid="planning-task-card-1"]')
    await card.find('[data-testid="planning-task-drag-handle"]').trigger('pointerdown', {
      button: 0,
      clientX: 10,
      clientY: 10,
    })
    elementFromPoint.mockReturnValue(wrapper.find('[data-testid="planning-drop-planned"]').element)
    pointer('pointermove', 200, 40)
    await nextTick()
    expect(card.attributes('style')).toContain('translate(190px, 30px)')
    pointer('pointerup', 200, 40)

    expect(wrapper.emitted('reschedule')).toEqual([[task(1), '2026-10-29']])
  })

  test('déposer vers « Non datées » retire l’échéance ; la colonne d’origine ne fait rien', async () => {
    const wrapper = mountKanban()
    const handle = () =>
      wrapper.find('[data-testid="planning-task-card-1"] [data-testid="planning-task-drag-handle"]')

    await handle().trigger('pointerdown', { button: 0, clientX: 0, clientY: 0 })
    elementFromPoint.mockReturnValue(wrapper.find('[data-testid="planning-drop-soon"]').element)
    pointer('pointermove', 50, 0)
    pointer('pointerup', 50, 0)
    expect(wrapper.emitted('reschedule')).toBeUndefined()

    await handle().trigger('pointerdown', { button: 0, clientX: 0, clientY: 0 })
    elementFromPoint.mockReturnValue(wrapper.find('[data-testid="planning-drop-undated"]').element)
    pointer('pointermove', 50, 0)
    pointer('pointerup', 50, 0)
    expect(wrapper.emitted('reschedule')).toEqual([[task(1), null]])
  })

  test('un appui sans déplacement n’est pas un glisser', async () => {
    const wrapper = mountKanban()
    await wrapper
      .find('[data-testid="planning-task-drag-handle"]')
      .trigger('pointerdown', { button: 0, clientX: 0, clientY: 0 })
    elementFromPoint.mockReturnValue(wrapper.find('[data-testid="planning-drop-planned"]').element)
    pointer('pointerup', 2, 2)
    expect(wrapper.emitted('reschedule')).toBeUndefined()
  })

  test('sans maintenance.edit, ni poignée ni zone armée', () => {
    const wrapper = mountKanban({ canReschedule: false })
    expect(wrapper.find('[data-testid="planning-task-drag-handle"]').exists()).toBe(false)
  })

  test('une tâche en heures moteur n’a pas de poignée', () => {
    const wrapper = mountKanban({
      soonTasks: [task(1, { kind: 'hours', dueAt: null, dueEngineHours: 500 })],
    })
    expect(
      wrapper
        .find('[data-testid="planning-task-card-1"] [data-testid="planning-task-drag-handle"]')
        .exists()
    ).toBe(false)
  })

  test('une carte pendant une réservation confirmée est marquée', () => {
    const wrapper = mountKanban({
      soonTasks: [task(1, { dueAt: '2026-10-30' })],
      reservations: [confirmed],
    })
    expect(wrapper.find('[data-testid="planning-task-conflict"]').text()).toBe(
      'planning.drag.conflictBadge'
    )
  })
})

describe('usePlanningReschedule (#869)', () => {
  beforeEach(() => patch.mockReset())

  function setup(reservations: PlanningReservation[] = []) {
    let api!: ReturnType<typeof usePlanningReschedule>
    mount(
      defineComponent({
        setup() {
          api = usePlanningReschedule(ref(reservations))
          return () => h('div')
        },
      })
    )
    return api
  }

  test('envoie un PATCH partiel et applique l’échéance en optimiste, puis la retire (rollback)', () => {
    const api = setup()
    api.request(task(1), '2026-10-29')

    expect(patch).toHaveBeenCalledTimes(1)
    const [url, data, options] = patch.mock.calls[0]
    expect(url).toBe('/boats/1/maintenance-tasks/1')
    expect(data).toEqual({ dueAt: '2026-10-29' })
    expect(options.preserveScroll).toBe(true)
    expect(options.only).toContain('soonTasks')
    expect(api.withOverride(task(1)).dueAt).toBe('2026-10-29')

    // Échec ou succès : la fin de visite rend la main aux props serveur.
    options.onFinish()
    expect(api.overrides.value.size).toBe(0)
    expect(api.withOverride(task(1)).dueAt).toBe('2026-10-01')
  })

  test('un dépôt sur une réservation confirmée attend confirmation', () => {
    const api = setup([confirmed])
    api.request(task(1), '2026-10-30')
    expect(patch).not.toHaveBeenCalled()
    expect(api.pending.value?.conflict.id).toBe(9)

    api.confirmPending()
    expect(patch).toHaveBeenCalledTimes(1)
    expect(api.pending.value).toBeNull()
  })

  test('annuler la confirmation n’envoie rien', () => {
    const api = setup([confirmed])
    api.request(task(1), '2026-10-30')
    api.isPendingOpen.value = false
    expect(api.pending.value).toBeNull()
    expect(patch).not.toHaveBeenCalled()
  })

  test('une tâche terminée, en heures moteur ou déjà à cette date ne part pas', () => {
    const api = setup()
    api.request(task(1, { status: 'done' }), '2026-10-29')
    api.request(task(2, { kind: 'hours' }), '2026-10-29')
    api.request(task(3), '2026-10-01')
    expect(patch).not.toHaveBeenCalled()
  })
})
