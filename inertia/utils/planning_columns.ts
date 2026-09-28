import { columnForDueAt } from '#shared/helpers/planning_schedule'
import type { PlanningTask } from '#shared/types/planning'

export interface PlanningColumns {
  overdueTasks: PlanningTask[]
  soonTasks: PlanningTask[]
  plannedTasks: PlanningTask[]
  undatedTasks: PlanningTask[]
}

const COLUMN_KEYS = {
  overdue: 'overdueTasks',
  soon: 'soonTasks',
  planned: 'plannedTasks',
  undated: 'undatedTasks',
} as const

/**
 * Rendu optimiste du glisser-déposer (#869) : une tâche en cours de
 * déplacement quitte sa colonne serveur pour celle de sa nouvelle échéance,
 * rangée comme le ferait `PlanningService`. Les autres ne bougent pas.
 */
export function applyDueAtOverrides(
  columns: PlanningColumns,
  overrides: ReadonlyMap<number, string | null>,
  today: string
): PlanningColumns {
  if (overrides.size === 0) return columns

  const result: PlanningColumns = {
    overdueTasks: [],
    soonTasks: [],
    plannedTasks: [],
    undatedTasks: [],
  }
  const moved: PlanningTask[] = []

  for (const key of Object.values(COLUMN_KEYS)) {
    for (const task of columns[key]) {
      if (overrides.has(task.id)) moved.push({ ...task, dueAt: overrides.get(task.id) ?? null })
      else result[key].push(task)
    }
  }
  for (const task of moved) {
    result[COLUMN_KEYS[columnForDueAt(task.dueAt, today)]].push(task)
  }
  return result
}
