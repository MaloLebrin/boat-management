import type { DateTime } from 'luxon'

export type InspectionKind = 'checkout' | 'checkin'

export type CreateInspectionPayload = {
  kind: InspectionKind
  performedAt: Date | string | DateTime
  /** getTimezoneOffset() of the submitting browser — used to shift the naive local datetime to UTC */
  tzOffsetMinutes?: number
  fuelLevel?: number | null
  engineHours?: number | null
  notes?: string | null
}

export type UpdateInspectionPayload = {
  performedAt?: Date | string | DateTime
  /** getTimezoneOffset() of the submitting browser — used to shift the naive local datetime to UTC */
  tzOffsetMinutes?: number
  fuelLevel?: number | null
  engineHours?: number | null
  notes?: string | null
}

export type BoatInspectionRow = {
  id: number
  reservationId: number
  kind: InspectionKind
  performedAt: string
  fuelLevel: number | null
  engineHours: string | null
  notes: string | null
  createdAt: string
}
