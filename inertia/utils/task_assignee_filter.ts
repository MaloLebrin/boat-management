import type { MaintenanceTaskWorkOrder } from '#shared/types/maintenance'

/**
 * Filtre « Assigné à » des listes de tâches (#868) : toutes, les miennes, les
 * non assignées, ou celles d'un membre donné (son id).
 */
export type TaskAssigneeFilter = 'all' | 'mine' | 'unassigned' | number

export function matchesAssigneeFilter(
  task: Pick<MaintenanceTaskWorkOrder, 'assignee'>,
  filter: TaskAssigneeFilter,
  currentUserId: number | null
): boolean {
  const assigneeId = task.assignee?.id ?? null
  if (filter === 'all') return true
  if (filter === 'unassigned') return assigneeId === null
  if (filter === 'mine') return currentUserId !== null && assigneeId === currentUserId
  return assigneeId === filter
}

/** Valeur d'un `<select>` (toujours une chaîne) ramenée au filtre typé. */
export function parseAssigneeFilter(raw: string | number): TaskAssigneeFilter {
  if (raw === 'all' || raw === 'mine' || raw === 'unassigned') return raw
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : 'all'
}
