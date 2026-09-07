import type { DateTime } from 'luxon'

export const INCIDENT_TYPES = [
  'grounding',
  'flooding',
  'rigging_failure',
  'engine_failure',
  'collision',
  'fire',
  'theft_vandalism',
  'other',
] as const

export type IncidentType = (typeof INCIDENT_TYPES)[number]

export type IncidentStatus = 'open' | 'in_progress' | 'closed'

export type CreateIncidentPayload = {
  occurredAt: Date | string | DateTime
  /** getTimezoneOffset() of the submitting browser — used to shift the naive local datetime to UTC */
  tzOffsetMinutes?: number
  type: IncidentType
  location?: string | null
  description: string
  insuranceClaimed?: boolean
  insuranceClaimRef?: string | null
}

export type UpdateIncidentPayload = {
  occurredAt?: Date | string | DateTime
  /** getTimezoneOffset() of the submitting browser — used to shift the naive local datetime to UTC */
  tzOffsetMinutes?: number
  type?: IncidentType
  location?: string | null
  description?: string
  insuranceClaimed?: boolean
  insuranceClaimRef?: string | null
  status?: IncidentStatus
}

export type BoatIncidentRow = {
  id: number
  boatId: number
  occurredAt: string
  type: IncidentType
  location: string | null
  description: string
  insuranceClaimed: boolean
  insuranceClaimRef: string | null
  status: IncidentStatus
  closedAt: string | null
  createdAt: string
}
