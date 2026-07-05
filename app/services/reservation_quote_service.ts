import { inject } from '@adonisjs/core'
import BoatPricingService from '#services/boat_pricing_service'
import PricingSeasonService from '#services/pricing_season_service'
import { toBoatPricingRow } from '#transformers/boat_pricing_transformer'
import { computeReservationQuote, type ReservationQuote } from '#shared/helpers/reservation_quote'
import type Boat from '#models/boat'

@inject()
export default class ReservationQuoteService {
  constructor(
    private boatPricingService: BoatPricingService,
    private pricingSeasonService: PricingSeasonService
  ) {}

  /**
   * Computes a reservation quote for a boat given the reservation dates.
   * Returns a quote with `hasPricing: false` if the boat has no pricing configured.
   */
  async quoteForBoat(boat: Boat, startsAt: string, endsAt: string): Promise<ReservationQuote> {
    const pricingModel = await this.boatPricingService.getForBoat(boat)
    const pricing = pricingModel ? toBoatPricingRow(pricingModel) : null
    const seasons = await this.pricingSeasonService.listForBoatScope(boat.organizationId, boat.id)
    return computeReservationQuote(pricing, seasons, startsAt, endsAt)
  }
}
