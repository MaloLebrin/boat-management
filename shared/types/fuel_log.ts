import type { DateTime } from 'luxon'

export type CreateFuelLogPayload = {
  fueledAt: Date | string | DateTime
  quantityLiters: number
  pricePerLiter?: number | null
  totalCost?: number | null
  engineHoursAtFueling?: number | null
  boatEngineId?: number | null
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
  supplier: string | null
  notes: string | null
  createdAt: string
}
