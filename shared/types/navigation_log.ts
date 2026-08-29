import type { DateTime } from 'luxon'
import type { NavigationLogCrewRow } from './crew.js'

export type NavigationLogStatus = 'in_progress' | 'completed'
export type SeaState = 'calm' | 'slight' | 'moderate' | 'rough' | 'very_rough'

export interface CreateNavigationLogPayload {
  departedAt: Date | string | DateTime
  /** getTimezoneOffset() of the submitting browser — used to shift the naive local datetime to UTC */
  tzOffsetMinutes?: number
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
  expectedUpdatedAt?: string
}

export interface CloseNavigationLogPayload {
  arrivedAt: Date | string | DateTime
  /** getTimezoneOffset() of the submitting browser — used to shift the naive local datetime to UTC */
  tzOffsetMinutes?: number
  arrivalPortId?: number | null
  arrivalPortName?: string | null
  distanceNm?: number | null
  engineHoursEnd?: number | null
  /** Which engine `engineHoursEnd` applies to (multi-engine boats). */
  boatEngineId?: number | null
  fuelConsumedLiters?: number | null
  windForceBeaufort?: number | null
  seaState?: SeaState | null
  crewCount?: number | null
  notes?: string | null
  expectedUpdatedAt?: string
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
  updatedAt: string
  crew: NavigationLogCrewRow[]
  entriesCount: number
}

export interface CreateNavigationLogEntryPayload {
  recordedAt: Date | string | DateTime
  /** getTimezoneOffset() of the submitting browser — used to shift the naive local datetime to UTC */
  tzOffsetMinutes?: number
  latitude?: number | null
  longitude?: number | null
  gpsAccuracyM?: number | null
  cogDeg?: number | null
  sogKn?: number | null
  sailConfig?: string | null
  note?: string | null
}

export interface UpdateNavigationLogEntryPayload {
  recordedAt?: Date | string | DateTime
  /** getTimezoneOffset() of the submitting browser — used to shift the naive local datetime to UTC */
  tzOffsetMinutes?: number
  latitude?: number | null
  longitude?: number | null
  gpsAccuracyM?: number | null
  cogDeg?: number | null
  sogKn?: number | null
  sailConfig?: string | null
  note?: string | null
}

export interface NavigationLogEntryRow {
  id: number
  navigationLogId: number
  recordedAt: string
  latitude: number | null
  longitude: number | null
  gpsAccuracyM: number | null
  cogDeg: number | null
  sogKn: number | null
  sailConfig: string | null
  note: string | null
  /** Réservés à l'itération météo (GRIB) — toujours null aujourd'hui. */
  twdDeg: number | null
  twaDeg: number | null
  createdAt: string
  updatedAt: string
}

/** Un échantillon brut de la rafale `watchPosition` (3-5 s au tap). */
export interface GpsSample {
  latitude: number
  longitude: number
  /** Précision estimée du fix, en mètres. */
  accuracy: number
  /** Epoch ms du fix. */
  timestamp: number
}

/** Résultat agrégé d'une rafale GPS : position retenue + COG/SOG représentatifs. */
export interface GpsBurstSummary {
  latitude: number
  longitude: number
  gpsAccuracyM: number
  /** Null quand la distance parcourue pendant la rafale est sous le seuil de bruit. */
  cogDeg: number | null
  sogKn: number | null
}

export interface NavigationLogPortOption {
  id: number
  name: string
}

export interface NavigationLogEngineOption {
  id: number
  label: string
}

export interface ConflictLogSnapshot {
  id: number
  updatedAt: string
  windForceBeaufort: number | null
  seaState: string | null
  crewCount: number | null
  notes: string | null
  arrivedAt: string | null
  arrivalPortId: number | null
  arrivalPortName: string | null
  distanceNm: number | null
  engineHoursEnd: number | null
  fuelConsumedLiters: number | null
}
