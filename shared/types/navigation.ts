import type { EngineFuel } from '../constants/boats/boat_form_options.js'
import type { IncidentStatus, IncidentType } from './incident.js'
import type { NavigationLogStatus, SeaState } from './navigation_log.js'

export interface FleetLogbookRow {
  id: number
  boatId: number
  boatName: string
  status: NavigationLogStatus
  departedAt: string
  arrivedAt: string | null
  departurePortName: string | null
  arrivalPortName: string | null
  distanceNm: number | null
  crewCount: number | null
  seaState: SeaState | null
  windForceBeaufort: number | null
  entriesCount: number
}

export interface FleetFuelLogRow {
  id: number
  boatId: number
  boatName: string
  fueledAt: string
  quantityLiters: number
  totalCost: number | null
  /** Carburant avitaillé (#585) — nul sur les pleins antérieurs. */
  fuelType: EngineFuel | null
  supplier: string | null
  notes: string | null
}

export interface FleetIncidentRow {
  id: number
  boatId: number
  boatName: string
  occurredAt: string
  type: IncidentType
  status: IncidentStatus
  location: string | null
  description: string
  insuranceClaimed: boolean
}

export interface FleetBoatOption {
  id: number
  name: string
}
