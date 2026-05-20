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

export type CreateMaintenancePayload = {
  subject: 'boat' | 'hull' | 'engine' | 'sail' | 'rig' | 'electrical' | 'plumbing' | 'safety' | 'deck' | 'other'
  boatEngineId?: number | null
  boatSailId?: number | null
  boatRigId?: number | null
  engineCaption?: string | null
  sailCaption?: string | null
  performedAt: Date | string | DateTime
  title: string
  notes?: string | null
  parts?: Array<{ name?: string | null; quantity?: string | null; notes?: string | null }>
}
