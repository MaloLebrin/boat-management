/**
 * Boat pricing types for Enterprise plan pricing feature.
 */

export interface BoatPricingRow {
  id: number
  boatId: number
  baseDailyPrice: number
  baseWeeklyPrice: number | null
  depositAmount: number | null
  minDays: number | null
  maxDays: number | null
  currency: string
  createdAt: string | null
  updatedAt: string | null
}

export interface UpsertBoatPricingPayload {
  baseDailyPrice: number
  baseWeeklyPrice?: number | null
  depositAmount?: number | null
  minDays?: number | null
  maxDays?: number | null
  currency?: string
}
