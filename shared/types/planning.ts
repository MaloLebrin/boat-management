export interface PlanningTask {
  id: number
  boatId: number
  boatName: string
  title: string
  subject: string
  kind: 'date' | 'hours'
  dueAt: string | null
  dueEngineHours: number | null
  currentEngineHours: number | null
  status: 'open' | 'done'
}

export interface MaintenanceHistoryEvent {
  id: number
  boatId: number
  boatName: string
  subject: string
  title: string
  notes: string | null
  performedAt: string
  engineCaption: string | null
  sailCaption: string | null
  boatEngineId: number | null
  boatSailId: number | null
  boatRigId: number | null
  parts: Array<{ id: number; name: string; quantity: number | null }>
}

export interface MaintenanceHistoryStats {
  totalEvents: number
  totalParts: number
  totalBoats: number
}

export interface TaskGroup {
  id: string
  subject: string
  boatId: number
  boatName: string
  tasks: PlanningTask[]
  earliestDueAt: string
  latestDueAt: string
}

export interface PlanningResult {
  tasks: PlanningTask[]
  overdueTasks: PlanningTask[]
  soonTasks: PlanningTask[]
  plannedTasks: PlanningTask[]
  undatedTasks: PlanningTask[]
  doneTasks: PlanningTask[]
  doneTasksTotal: number
  groups: TaskGroup[]
  canGroupTasks: boolean
}
