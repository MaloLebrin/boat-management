import type { DateTime } from 'luxon'

export type IncidentType =
  | 'grounding'
  | 'flooding'
  | 'rigging_failure'
  | 'engine_failure'
  | 'collision'
  | 'fire'
  | 'theft_vandalism'
  | 'other'

export type IncidentStatus = 'open' | 'in_progress' | 'closed'

export type CreateIncidentPayload = {
  occurredAt: Date | string | DateTime
  type: IncidentType
  location?: string | null
  description: string
  insuranceClaimed?: boolean
  insuranceClaimRef?: string | null
}

export type UpdateIncidentPayload = {
  occurredAt?: Date | string | DateTime
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
