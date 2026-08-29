import type { DateTime } from 'luxon'
import type { EngineFuel } from '../constants/boats/boat_form_options.js'

export type CreateFuelLogPayload = {
  fueledAt: Date | string | DateTime
  quantityLiters: number
  pricePerLiter?: number | null
  totalCost?: number | null
  engineHoursAtFueling?: number | null
  boatEngineId?: number | null
  /** Carburant avitaillé (#585) — nul tant qu'il n'est pas précisé. */
  fuelType?: EngineFuel | null
  supplier?: string | null
  notes?: string | null
}

export type FuelLogRow = {
  id: number
  boatId: number
  boatEngineId: number | null
  fueledAt: string
  quantityLiters: number
  pricePerLiter: number | null
  totalCost: number | null
  engineHoursAtFueling: number | null
  fuelType: EngineFuel | null
  supplier: string | null
  notes: string | null
  createdAt: string
}
