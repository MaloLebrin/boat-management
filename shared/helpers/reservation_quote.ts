import { DateTime } from 'luxon'
import type { BoatPricingRow } from '#shared/types/boat_pricing'
import type { PricingSeasonRow } from '#shared/types/pricing_season'

/**
 * One aggregated line of a reservation estimate. Consecutive nights charged at
 * the same rate (same season, same unit price) are grouped into a single line.
 */
export interface ReservationQuoteLine {
  /** Season name that applied, or `null` for the boat's base rate. */
  seasonName: string | null
  /** Per-unit price (per night, or per week when `isWeekly`). */
  unitPrice: number
  /** Number of units billed (nights, or weeks when `isWeekly`). */
  quantity: number
  /** `unitPrice * quantity`, rounded to 2 decimals. */
  amount: number
  /** Whether this line is billed at the weekly rate rather than per night. */
  isWeekly: boolean
}

export type ReservationBoundsError = 'below_min' | 'above_max' | null

export interface ReservationQuote {
  /** `false` when the boat has no base pricing configured (no estimate possible). */
  hasPricing: boolean
  currency: string
  /** Number of billed nights (calendar-day difference between start and end). */
  nights: number
  total: number
  deposit: number | null
  minDays: number | null
  maxDays: number | null
  /** `true` when the duration respects the boat's min/max-days bounds. */
  withinBounds: boolean
  boundsError: ReservationBoundsError
  /** `true` when at least one week was billed at the weekly rate. */
  usedWeeklyRate: boolean
  lines: ReservationQuoteLine[]
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * Number of billed nights = calendar-day difference between the two dates.
 * Only the date part is considered (time-of-day is ignored), so a booking from
 * 2026-07-01T10:00 to 2026-07-04T18:00 counts as 3 nights.
 */
export function countBilledNights(startsAt: string, endsAt: string): number {
  const start = DateTime.fromISO(String(startsAt).slice(0, 10))
  const end = DateTime.fromISO(String(endsAt).slice(0, 10))
  if (!start.isValid || !end.isValid) return 0
  const diff = Math.round(end.diff(start, 'days').days)
  return diff > 0 ? diff : 0
}

/**
 * Picks the season applicable to a given date among the provided seasons.
 * Higher `priority` wins; on a tie a boat-specific season (`boatId !== null`)
 * takes precedence over a global one. Returns `null` when no season covers the
 * date. `seasons` is expected to already be scoped to the boat (its own
 * boat-specific seasons + the org's global seasons).
 */
function seasonForDate(seasons: PricingSeasonRow[], date: string): PricingSeasonRow | null {
  const applicable = seasons.filter((s) => s.startsOn <= date && date <= s.endsOn)
  if (applicable.length === 0) return null

  return applicable.reduce((best, current) => {
    if (current.priority !== best.priority) return current.priority > best.priority ? current : best
    const currentBoatSpecific = current.boatId !== null ? 1 : 0
    const bestBoatSpecific = best.boatId !== null ? 1 : 0
    return currentBoatSpecific > bestBoatSpecific ? current : best
  })
}

function dailyRateForSeason(season: PricingSeasonRow, baseDailyPrice: number): number {
  if (season.dailyPrice !== null) return season.dailyPrice
  if (season.multiplier !== null) return round2(baseDailyPrice * season.multiplier)
  return baseDailyPrice
}

/**
 * Computes a reservation estimate from a boat's base pricing, the applicable
 * seasonal periods and the reservation dates. Pure and deterministic — shared
 * by the backend (to pre-fill `total_price` and enforce duration bounds) and the
 * frontend (live estimate on the reservation form).
 *
 * Rules:
 * - Each night is billed at its applicable season rate (absolute `dailyPrice`
 *   or `base * multiplier`), falling back to the base daily price.
 * - When NO season applies to any night and a weekly price is set, full weeks
 *   are billed at the weekly rate and the remainder per night ("semaine vs jour").
 * - Duration is checked against the boat's min/max-days bounds.
 */
export function computeReservationQuote(
  pricing: BoatPricingRow | null,
  seasons: PricingSeasonRow[],
  startsAt: string,
  endsAt: string
): ReservationQuote {
  const nights = countBilledNights(startsAt, endsAt)

  if (!pricing) {
    return {
      hasPricing: false,
      currency: '',
      nights,
      total: 0,
      deposit: null,
      minDays: null,
      maxDays: null,
      withinBounds: true,
      boundsError: null,
      usedWeeklyRate: false,
      lines: [],
    }
  }

  const base = pricing.baseDailyPrice
  const weekly = pricing.baseWeeklyPrice
  const minDays = pricing.minDays
  const maxDays = pricing.maxDays

  let boundsError: ReservationBoundsError = null
  if (nights > 0) {
    if (minDays !== null && nights < minDays) boundsError = 'below_min'
    else if (maxDays !== null && nights > maxDays) boundsError = 'above_max'
  }

  const baseResult = {
    hasPricing: true,
    currency: pricing.currency,
    nights,
    deposit: pricing.depositAmount,
    minDays,
    maxDays,
    withinBounds: boundsError === null,
    boundsError,
  }

  if (nights <= 0) {
    return { ...baseResult, total: 0, usedWeeklyRate: false, lines: [] }
  }

  // Determine the applicable season (and rate) for each night.
  const start = DateTime.fromISO(String(startsAt).slice(0, 10))
  const perNight: { seasonName: string | null; rate: number }[] = []
  let anySeasonApplied = false
  for (let i = 0; i < nights; i++) {
    const date = start.plus({ days: i }).toISODate()!
    const season = seasonForDate(seasons, date)
    if (season) {
      anySeasonApplied = true
      perNight.push({ seasonName: season.name, rate: dailyRateForSeason(season, base) })
    } else {
      perNight.push({ seasonName: null, rate: base })
    }
  }

  // Weekly optimisation: only when the whole stay is at the base rate.
  if (!anySeasonApplied && weekly !== null) {
    const weeks = Math.floor(nights / 7)
    const remainder = nights % 7
    const lines: ReservationQuoteLine[] = []
    if (weeks > 0) {
      lines.push({
        seasonName: null,
        unitPrice: weekly,
        quantity: weeks,
        amount: round2(weeks * weekly),
        isWeekly: true,
      })
    }
    if (remainder > 0) {
      lines.push({
        seasonName: null,
        unitPrice: base,
        quantity: remainder,
        amount: round2(remainder * base),
        isWeekly: false,
      })
    }
    const total = round2(lines.reduce((sum, l) => sum + l.amount, 0))
    return { ...baseResult, total, usedWeeklyRate: weeks > 0, lines }
  }

  // Per-night billing, grouping nights that share the same season + rate.
  const groups = new Map<string, ReservationQuoteLine>()
  const order: string[] = []
  for (const night of perNight) {
    const key = `${night.seasonName ?? ''}|${night.rate}`
    let line = groups.get(key)
    if (!line) {
      line = {
        seasonName: night.seasonName,
        unitPrice: night.rate,
        quantity: 0,
        amount: 0,
        isWeekly: false,
      }
      groups.set(key, line)
      order.push(key)
    }
    line.quantity += 1
    line.amount = round2(line.quantity * line.unitPrice)
  }
  const lines = order.map((key) => groups.get(key)!)
  const total = round2(lines.reduce((sum, l) => sum + l.amount, 0))

  return { ...baseResult, total, usedWeeklyRate: false, lines }
}
