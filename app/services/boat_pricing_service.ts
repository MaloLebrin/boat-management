import { inject } from '@adonisjs/core'
import BoatPricing from '#models/boat_pricing'
import type Boat from '#models/boat'
import type Organization from '#models/organization'
import type { UpsertBoatPricingPayload } from '#shared/types/boat_pricing'
import { InvalidPricingRangeError } from '#exceptions/boat_pricing_errors'

export { InvalidPricingRangeError }

@inject()
export default class BoatPricingService {
  /**
   * Retrieve the pricing for a boat, if any.
   */
  async getForBoat(boat: Boat): Promise<BoatPricing | null> {
    return BoatPricing.query().where('boatId', boat.id).first()
  }

  /**
   * Create or update pricing for a boat.
   * Validates that maxDays >= minDays when both are provided.
   * Uses preserve-if-absent pattern for updates.
   */
  async upsert(
    org: Organization,
    boat: Boat,
    payload: UpsertBoatPricingPayload
  ): Promise<BoatPricing> {
    // Validate minDays/maxDays range
    const minDays = payload.minDays ?? null
    const maxDays = payload.maxDays ?? null
    if (minDays !== null && maxDays !== null && maxDays < minDays) {
      throw new InvalidPricingRangeError()
    }

    // Check if pricing already exists
    const existing = await BoatPricing.query().where('boatId', boat.id).first()

    if (existing) {
      // Preserve-if-absent: only update fields present in payload
      existing.baseDailyPrice = String(payload.baseDailyPrice)

      if (payload.baseWeeklyPrice !== undefined) {
        existing.baseWeeklyPrice =
          payload.baseWeeklyPrice !== null ? String(payload.baseWeeklyPrice) : null
      }
      if (payload.depositAmount !== undefined) {
        existing.depositAmount =
          payload.depositAmount !== null ? String(payload.depositAmount) : null
      }
      if (payload.minDays !== undefined) {
        existing.minDays = payload.minDays ?? null
      }
      if (payload.maxDays !== undefined) {
        existing.maxDays = payload.maxDays ?? null
      }
      if (payload.currency !== undefined) {
        existing.currency = payload.currency
      }

      await existing.save()
      return existing
    }

    // Create new pricing
    return BoatPricing.create({
      organizationId: org.id,
      boatId: boat.id,
      baseDailyPrice: String(payload.baseDailyPrice),
      baseWeeklyPrice:
        payload.baseWeeklyPrice !== undefined && payload.baseWeeklyPrice !== null
          ? String(payload.baseWeeklyPrice)
          : null,
      depositAmount:
        payload.depositAmount !== undefined && payload.depositAmount !== null
          ? String(payload.depositAmount)
          : null,
      minDays: payload.minDays ?? null,
      maxDays: payload.maxDays ?? null,
      currency: payload.currency ?? 'EUR',
    })
  }
}
