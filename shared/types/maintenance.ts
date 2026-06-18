import type { DateTime } from 'luxon'

export type MaintenanceTaskSubject =
  | 'boat'
  | 'hull'
  | 'engine'
  | 'sail'
  | 'rig'
  | 'electrical'
  | 'plumbing'
  | 'safety'
  | 'deck'
  | 'other'

export type MaintenancePartInput = {
  name?: string | null
  quantity?: string | null
  notes?: string | null
  enginePartId?: number | null
  unitPrice?: string | null
}

export type CreateMaintenancePayload = {
  subject:
    | 'boat'
    | 'hull'
    | 'engine'
    | 'sail'
    | 'rig'
    | 'electrical'
    | 'plumbing'
    | 'safety'
    | 'deck'
    | 'other'
  boatEngineId?: number | null
  boatSailId?: number | null
  boatRigId?: number | null
  boatSafetyEquipmentId?: number | null
  engineCaption?: string | null
  sailCaption?: string | null
  performedAt: Date | string | DateTime
  title: string
  notes?: string | null
  parts?: Array<MaintenancePartInput>
}

export type MaintenanceEventPartRow = {
  id: number
  name: string
  quantity: number | null
  unitPrice: number | null
  totalCost: number | null
  enginePartId: number | null
}

export type MaintenanceEventRow = {
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
  boatSafetyEquipmentId: number | null
  parts: MaintenanceEventPartRow[]
  totalCost: number | null
}

export type CreateMaintenanceTaskPayload = {
  subject: MaintenanceTaskSubject
  title: string
  notes?: string | null
  boatEngineId?: number | null
  boatSailId?: number | null
  boatRigId?: number | null
  dueAt?: Date | string | DateTime | null
  recurrenceIntervalMonths?: number | null
  dueEngineHours?: number | null
  recurrenceIntervalEngineHours?: number | null
}

export type MarkTaskDonePayload = {
  doneAt?: Date | string | DateTime
  doneEngineHours?: number | null
}

export type BoatMaintenanceBadge = {
  urgentCount: number
  upcomingCount: number
  nextDueAt: string | null
}

export type SheetType = 'entretien' | 'montage' | 'hivernage' | 'dehivernage' | 'atelier'

export type SheetTemplateItem = { label: string; position: number }

export type CreateSheetPayload = {
  type: SheetType
  title: string
  performedAt: Date | DateTime
  notes: string | null
}

export type UpdateItemPayload = {
  isDone: boolean
  notes: string | null
}

export type MaintenanceDateBadgeRow = { boatId: number | string; nextDueAt: string | null }

export type MaintenanceMaxDoneRow = { boatEngineId: number | string; maxDone: number | string }

export type MaintenanceBadgeOpts = {
  urgentWithinDays?: number
  urgentWithinEngineHours?: number
}
