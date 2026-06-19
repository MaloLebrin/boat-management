export type ReminderKind =
  | 'inactive_account'
  | 'incomplete_boat'
  | 'incomplete_port'
  | 'inactive_login'
  | 'overdue_task'
  | 'engine_task_due'
  | 'boat_check_due'
  | 'document_expiry_30'
  | 'document_expiry_7'

export interface ReminderTaskItem {
  id: number
  title: string
  boatName: string
  dueAt: string | null
}

export interface ReminderBoatItem {
  id: number
  name: string
}

export interface ReminderPortItem {
  id: number
  name: string
}
