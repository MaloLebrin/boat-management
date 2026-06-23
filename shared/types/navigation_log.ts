import type { DateTime } from 'luxon'
import type { NavigationLogCrewRow } from './crew.js'

export type NavigationLogStatus = 'in_progress' | 'completed'
export type SeaState = 'calm' | 'slight' | 'moderate' | 'rough' | 'very_rough'

export interface CreateNavigationLogPayload {
  departedAt: Date | string | DateTime
  departurePortId?: number | null
  departurePortName?: string | null
  engineHoursStart?: number | null
  windForceBeaufort?: number | null
  seaState?: SeaState | null
  crewCount?: number | null
  notes?: string | null
}

export interface UpdateNavigationLogPayload {
  windForceBeaufort?: number | null
  seaState?: SeaState | null
  crewCount?: number | null
  notes?: string | null
}

export interface CloseNavigationLogPayload {
  arrivedAt: Date | string | DateTime
  arrivalPortId?: number | null
  arrivalPortName?: string | null
  distanceNm?: number | null
  engineHoursEnd?: number | null
  fuelConsumedLiters?: number | null
  windForceBeaufort?: number | null
  seaState?: SeaState | null
  crewCount?: number | null
  notes?: string | null
}

export interface NavigationLogRow {
  id: number
  boatId: number
  status: NavigationLogStatus
  departedAt: string
  arrivedAt: string | null
  departurePortId: number | null
  departurePortName: string | null
  arrivalPortId: number | null
  arrivalPortName: string | null
  distanceNm: number | null
  engineHoursStart: number | null
  engineHoursEnd: number | null
  fuelConsumedLiters: number | null
  windForceBeaufort: number | null
  seaState: SeaState | null
  crewCount: number | null
  notes: string | null
  createdAt: string
  crew: NavigationLogCrewRow[]
}

export interface NavigationLogPortOption {
  id: number
  name: string
}
