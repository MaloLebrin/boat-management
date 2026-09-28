import { router } from '@inertiajs/vue3'
import { computed, ref, type Ref } from 'vue'
import { reservationConflictFor } from '#shared/helpers/planning_schedule'
import type { PlanningReservation, PlanningTask } from '#shared/types/planning'

/** Props rechargées après un déplacement : le planning seul, pas toute la page. */
export const PLANNING_RELOAD_PROPS = [
  'tasks',
  'overdueTasks',
  'soonTasks',
  'plannedTasks',
  'undatedTasks',
  'doneTasks',
  'doneTasksTotal',
  'doneTasksTotalByAssignee',
  'groups',
  'reservations',
  'errors',
  'flash',
]

export interface PendingReschedule {
  task: PlanningTask
  dueAt: string | null
  conflict: PlanningReservation
}

/**
 * Déplacement d'une tâche du planning par glisser-déposer (#869).
 *
 * - **Rendu optimiste** : la nouvelle échéance s'applique tout de suite via
 *   `overrides` ; elle est retirée à la fin de la visite, que la réponse
 *   confirme (les props rechargées portent alors la même date) ou échoue (la
 *   carte revient à sa place : c'est le rollback).
 * - **Conflit** : une échéance qui tombe pendant une réservation confirmée du
 *   même bateau est d'abord soumise à confirmation (`pending`).
 */
export function usePlanningReschedule(reservations: Ref<PlanningReservation[]>) {
  const overrides = ref(new Map<number, string | null>())
  const pending = ref<PendingReschedule | null>(null)

  function send(task: PlanningTask, dueAt: string | null) {
    overrides.value = new Map(overrides.value).set(task.id, dueAt)
    router.patch(
      `/boats/${task.boatId}/maintenance-tasks/${task.id}`,
      { dueAt },
      {
        preserveScroll: true,
        only: PLANNING_RELOAD_PROPS,
        onFinish: () => {
          const next = new Map(overrides.value)
          next.delete(task.id)
          overrides.value = next
        },
      }
    )
  }

  function request(task: PlanningTask, dueAt: string | null) {
    if (task.kind !== 'date' || task.status !== 'open' || dueAt === task.dueAt) return
    const conflict = reservationConflictFor({ ...task, dueAt }, reservations.value)
    if (conflict) {
      pending.value = { task, dueAt, conflict }
      return
    }
    send(task, dueAt)
  }

  function confirmPending() {
    if (!pending.value) return
    const { task, dueAt } = pending.value
    pending.value = null
    send(task, dueAt)
  }

  function cancelPending() {
    pending.value = null
  }

  /** La tâche, avec l'échéance en cours d'envoi si elle a été déplacée. */
  function withOverride(task: PlanningTask): PlanningTask {
    return overrides.value.has(task.id) ? { ...task, dueAt: overrides.value.get(task.id)! } : task
  }

  const isPendingOpen = computed({
    get: () => pending.value !== null,
    set: (open: boolean) => {
      if (!open) cancelPending()
    },
  })

  return {
    overrides,
    pending,
    isPendingOpen,
    request,
    confirmPending,
    cancelPending,
    withOverride,
  }
}
