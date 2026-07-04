export interface PricingSeasonRow {
  id: number
  boatId: number | null
  boatName: string | null
  name: string
  startsOn: string // 'YYYY-MM-DD'
  endsOn: string // 'YYYY-MM-DD'
  dailyPrice: number | null
  multiplier: number | null
  priority: number
  createdAt: string | null
  updatedAt: string | null
}

export interface BoatOption {
  id: number
  name: string
}

export interface CreatePricingSeasonPayload {
  boatId?: number | null
  name: string
  startsOn: string
  endsOn: string
  dailyPrice?: number | null
  multiplier?: number | null
  priority?: number
}

export type UpdatePricingSeasonPayload = CreatePricingSeasonPayload

export interface PricingSeasonListFilters {
  boatId: number | null // null = pas de filtre (toutes les periodes)
}
