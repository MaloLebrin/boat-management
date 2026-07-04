import type BoatPricing from '#models/boat_pricing'
import type { BoatPricingRow } from '#shared/types/boat_pricing'

export function toBoatPricingRow(p: BoatPricing): BoatPricingRow {
  return {
    id: p.id,
    boatId: p.boatId,
    baseDailyPrice: Number.parseFloat(p.baseDailyPrice),
    baseWeeklyPrice: p.baseWeeklyPrice !== null ? Number.parseFloat(p.baseWeeklyPrice) : null,
    depositAmount: p.depositAmount !== null ? Number.parseFloat(p.depositAmount) : null,
    minDays: p.minDays,
    maxDays: p.maxDays,
    currency: p.currency,
    createdAt: p.createdAt?.toISO() ?? null,
    updatedAt: p.updatedAt?.toISO() ?? null,
  }
}
