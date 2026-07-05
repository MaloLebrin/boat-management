import {
  PricingSeasonNotFoundError,
  SeasonOverlapError,
  InvalidSeasonDateRangeError,
  InvalidSeasonPriceError,
  SeasonBoatNotFoundError,
} from '#exceptions/pricing_season_errors'
import Boat from '#models/boat'
import PricingSeason from '#models/pricing_season'
import type Organization from '#models/organization'
import type {
  PricingSeasonRow,
  PricingSeasonListFilters,
  CreatePricingSeasonPayload,
  UpdatePricingSeasonPayload,
  BoatOption,
} from '#shared/types/pricing_season'
import { DateTime } from 'luxon'

export {
  PricingSeasonNotFoundError,
  SeasonOverlapError,
  InvalidSeasonDateRangeError,
  InvalidSeasonPriceError,
  SeasonBoatNotFoundError,
}

function toIntegerOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value !== 'string') return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

export default class PricingSeasonService {
  normalizeFilters(qs: Record<string, unknown>): PricingSeasonListFilters {
    const boatId = toIntegerOrNull(qs.boatId)
    return { boatId }
  }

  async list(org: Organization, filters: PricingSeasonListFilters): Promise<PricingSeasonRow[]> {
    const query = PricingSeason.query()
      .where('organizationId', org.id)
      .preload('boat')
      .orderBy('priority', 'desc')
      .orderBy('starts_on', 'asc')

    if (filters.boatId !== null) {
      query.where('boatId', filters.boatId)
    }

    const seasons = await query

    return seasons.map((season) => this.#toRow(season))
  }

  async listBoatOptions(org: Organization): Promise<BoatOption[]> {
    const boats = await Boat.query()
      .where('organizationId', org.id)
      .select(['id', 'name'])
      .orderBy('name', 'asc')

    return boats.map((boat) => ({
      id: boat.id,
      name: boat.name,
    }))
  }

  async getForOrganizationOrFail(org: Organization, id: number): Promise<PricingSeason> {
    const season = await PricingSeason.query()
      .where('id', id)
      .where('organizationId', org.id)
      .first()

    if (!season) throw new PricingSeasonNotFoundError()
    return season
  }

  async create(org: Organization, payload: CreatePricingSeasonPayload): Promise<PricingSeason> {
    const startsOn = DateTime.fromISO(payload.startsOn)
    const endsOn = DateTime.fromISO(payload.endsOn)

    // Rule 1: Date order
    if (startsOn > endsOn) {
      throw new InvalidSeasonDateRangeError()
    }

    // Rule 2: XOR price
    const hasDailyPrice = payload.dailyPrice !== undefined && payload.dailyPrice !== null
    const hasMultiplier = payload.multiplier !== undefined && payload.multiplier !== null

    if (hasDailyPrice === hasMultiplier) {
      // Either both or neither
      throw new InvalidSeasonPriceError()
    }

    if (hasMultiplier && payload.multiplier! <= 0) {
      throw new InvalidSeasonPriceError()
    }

    // Rule 4: boat_id belongs to org
    const boatId = payload.boatId ?? null
    if (boatId !== null) {
      const boat = await Boat.query().where('id', boatId).where('organizationId', org.id).first()

      if (!boat) {
        throw new SeasonBoatNotFoundError()
      }
    }

    // Rule 3: Check overlap within same scope
    await this.#assertNoOverlap(org, boatId, startsOn, endsOn, null)

    return await PricingSeason.create({
      organizationId: org.id,
      boatId,
      name: payload.name.trim(),
      startsOn,
      endsOn,
      dailyPrice: hasDailyPrice ? String(payload.dailyPrice) : null,
      multiplier: hasMultiplier ? String(payload.multiplier) : null,
      priority: payload.priority ?? 0,
    })
  }

  async update(season: PricingSeason, payload: UpdatePricingSeasonPayload): Promise<PricingSeason> {
    const startsOn =
      payload.startsOn !== undefined ? DateTime.fromISO(payload.startsOn) : season.startsOn
    const endsOn = payload.endsOn !== undefined ? DateTime.fromISO(payload.endsOn) : season.endsOn

    // Rule 1: Date order
    if (startsOn > endsOn) {
      throw new InvalidSeasonDateRangeError()
    }

    // Preserve-if-absent for price fields
    const dailyPriceProvided = payload.dailyPrice !== undefined
    const multiplierProvided = payload.multiplier !== undefined

    let finalDailyPrice: string | null = season.dailyPrice
    let finalMultiplier: string | null = season.multiplier

    if (dailyPriceProvided) {
      finalDailyPrice = payload.dailyPrice !== null ? String(payload.dailyPrice) : null
    }
    if (multiplierProvided) {
      finalMultiplier = payload.multiplier !== null ? String(payload.multiplier) : null
    }

    // Rule 2: XOR price (after preserve-if-absent)
    const hasDailyPrice = finalDailyPrice !== null
    const hasMultiplier = finalMultiplier !== null

    if (hasDailyPrice === hasMultiplier) {
      throw new InvalidSeasonPriceError()
    }

    if (hasMultiplier && Number.parseFloat(finalMultiplier!) <= 0) {
      throw new InvalidSeasonPriceError()
    }

    // Rule 4: boat_id belongs to org (if changed)
    const boatIdProvided = payload.boatId !== undefined
    let finalBoatId: number | null = season.boatId

    if (boatIdProvided) {
      finalBoatId = payload.boatId ?? null
      if (finalBoatId !== null) {
        const boat = await Boat.query()
          .where('id', finalBoatId)
          .where('organizationId', season.organizationId)
          .first()

        if (!boat) {
          throw new SeasonBoatNotFoundError()
        }
      }
    }

    // Load org for overlap check
    await season.load('organization')

    // Rule 3: Check overlap within same scope (exclude current season)
    await this.#assertNoOverlap(season.organization, finalBoatId, startsOn, endsOn, season.id)

    // Apply updates
    if (payload.name !== undefined) season.name = payload.name.trim()
    if (payload.startsOn !== undefined) season.startsOn = startsOn
    if (payload.endsOn !== undefined) season.endsOn = endsOn
    if (payload.priority !== undefined) season.priority = payload.priority
    if (boatIdProvided) season.boatId = finalBoatId
    season.dailyPrice = finalDailyPrice
    season.multiplier = finalMultiplier

    await season.save()
    return season
  }

  async delete(season: PricingSeason): Promise<void> {
    await season.delete()
  }

  async #assertNoOverlap(
    org: Organization,
    boatId: number | null,
    startsOn: DateTime,
    endsOn: DateTime,
    excludeId: number | null
  ): Promise<void> {
    const query = PricingSeason.query().where('organizationId', org.id)

    // Scope: same boat_id (null = global scope)
    if (boatId === null) {
      query.whereNull('boatId')
    } else {
      query.where('boatId', boatId)
    }

    // Exclude current season on update
    if (excludeId !== null) {
      query.whereNot('id', excludeId)
    }

    // Overlap check: startsOn <= other.endsOn AND endsOn >= other.startsOn
    query.where('starts_on', '<=', endsOn.toISODate()!)
    query.where('ends_on', '>=', startsOn.toISODate()!)

    const overlapping = await query.first()

    if (overlapping) {
      throw new SeasonOverlapError()
    }
  }

  /**
   * Returns all pricing seasons applicable to a specific boat:
   * - Seasons scoped to this boat (boatId = boat.id)
   * - Global seasons (boatId = null) from the same organization
   *
   * Sorted by priority (desc), then by starts_on (asc).
   */
  async listForBoatScope(organizationId: number, boatId: number): Promise<PricingSeasonRow[]> {
    const seasons = await PricingSeason.query()
      .where('organizationId', organizationId)
      .where((q) => q.where('boatId', boatId).orWhereNull('boatId'))
      .preload('boat')
      .orderBy('priority', 'desc')
      .orderBy('starts_on', 'asc')

    return seasons.map((season) => this.#toRow(season))
  }

  #toRow(season: PricingSeason): PricingSeasonRow {
    return {
      id: season.id,
      boatId: season.boatId,
      boatName: season.boat?.name ?? null,
      name: season.name,
      startsOn: season.startsOn.toISODate()!,
      endsOn: season.endsOn.toISODate()!,
      dailyPrice: season.dailyPrice !== null ? Number.parseFloat(season.dailyPrice) : null,
      multiplier: season.multiplier !== null ? Number.parseFloat(season.multiplier) : null,
      priority: season.priority,
      createdAt: season.createdAt?.toISO() ?? null,
      updatedAt: season.updatedAt?.toISO() ?? null,
    }
  }
}
