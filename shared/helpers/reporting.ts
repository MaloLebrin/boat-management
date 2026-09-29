import { DateTime } from 'luxon'
import {
  REPORT_COST_CATEGORIES,
  REPORT_MAX_RANGE_DAYS,
  type ReportCostBreakdown,
  type ReportCostCategory,
  type ReportMetrics,
  type ReportPeriod,
  type ReportPeriodPreset,
} from '../types/reporting.js'

const DAY_MS = 86_400_000

/** Arrondi monétaire au centime — les sommes SQL arrivent en `numeric` texte. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function emptyCostBreakdown(): ReportCostBreakdown {
  return { maintenance: 0, fuel: 0, documents: 0, port: 0, equipment: 0, entries: 0, total: 0 }
}

export function addCost(
  breakdown: ReportCostBreakdown,
  category: ReportCostCategory,
  amount: number
): void {
  breakdown[category] = roundMoney(breakdown[category] + amount)
  breakdown.total = roundMoney(breakdown.total + amount)
}

export function sumCostBreakdowns(items: ReportCostBreakdown[]): ReportCostBreakdown {
  const sum = emptyCostBreakdown()
  for (const item of items) {
    for (const category of REPORT_COST_CATEGORIES) addCost(sum, category, item[category])
  }
  return sum
}

function periodOf(preset: ReportPeriodPreset, from: DateTime, to: DateTime): ReportPeriod {
  return {
    preset,
    from: from.toISODate()!,
    to: to.toISODate()!,
    days: Math.round(to.startOf('day').diff(from.startOf('day'), 'days').days) + 1,
  }
}

/**
 * Bornes d'une période, en jours civils inclus. `today` est la date du jour
 * de l'organisation (`YYYY-MM-DD`). Une plage personnalisée incomplète,
 * inversée ou trop longue retombe sur le mois courant plutôt que d'échouer :
 * c'est un filtre d'affichage, pas une saisie à rejeter.
 */
export function resolveReportPeriod(
  preset: ReportPeriodPreset,
  today: string,
  custom: { from?: string | null; to?: string | null } = {}
): ReportPeriod {
  const now = DateTime.fromISO(today, { zone: 'utc' })
  switch (preset) {
    case 'quarter':
      return periodOf(preset, now.startOf('quarter'), now.endOf('quarter'))
    case 'year':
      return periodOf(preset, now.startOf('year'), now.endOf('year'))
    case 'rolling12':
      return periodOf(preset, now.minus({ months: 11 }).startOf('month'), now.endOf('month'))
    case 'custom': {
      const from = custom.from ? DateTime.fromISO(custom.from, { zone: 'utc' }) : null
      const to = custom.to ? DateTime.fromISO(custom.to, { zone: 'utc' }) : null
      if (from?.isValid && to?.isValid && to >= from) {
        const period = periodOf(preset, from, to)
        if (period.days <= REPORT_MAX_RANGE_DAYS) return period
      }
      return periodOf('month', now.startOf('month'), now.endOf('month'))
    }
    case 'month':
    default:
      return periodOf('month', now.startOf('month'), now.endOf('month'))
  }
}

/**
 * Période de comparaison : même préréglage décalé d'un cran (mois, trimestre
 * ou année précédents) ; pour `rolling12` et `custom`, la plage de même durée
 * qui précède immédiatement.
 */
export function previousReportPeriod(period: ReportPeriod): ReportPeriod {
  const from = DateTime.fromISO(period.from, { zone: 'utc' })
  switch (period.preset) {
    case 'month': {
      const start = from.minus({ months: 1 })
      return periodOf('month', start, start.endOf('month'))
    }
    case 'quarter': {
      const start = from.minus({ months: 3 })
      return periodOf('quarter', start, start.endOf('quarter'))
    }
    case 'year': {
      const start = from.minus({ years: 1 })
      return periodOf('year', start, start.endOf('year'))
    }
    default: {
      const end = from.minus({ days: 1 })
      return periodOf(period.preset, end.minus({ days: period.days - 1 }), end)
    }
  }
}

/** Mois `YYYY-MM` couverts par la période, dans l'ordre. */
export function reportMonths(period: ReportPeriod): string[] {
  const months: string[] = []
  let cursor = DateTime.fromISO(period.from, { zone: 'utc' }).startOf('month')
  const last = DateTime.fromISO(period.to, { zone: 'utc' }).startOf('month')
  while (cursor <= last) {
    months.push(cursor.toFormat('yyyy-MM'))
    cursor = cursor.plus({ months: 1 })
  }
  return months
}

/** Borne exclusive de fin : minuit du lendemain du dernier jour, en UTC. */
export function periodEndExclusive(period: ReportPeriod): DateTime {
  return DateTime.fromISO(period.to, { zone: 'utc' }).plus({ days: 1 }).startOf('day')
}

export interface RentalSlice {
  /** `YYYY-MM` */
  month: string
  days: number
  revenue: number
}

/**
 * Découpe une réservation confirmée en tranches mensuelles bornées à la
 * période : jours loués et part du prix au prorata de la durée. Une location
 * du 28 au 3 compte pour moitié environ dans chacun des deux mois — c'est ce
 * qui évite de gonfler le mois de départ d'une croisière de deux semaines.
 */
export function splitRental(
  startsAt: DateTime,
  endsAt: DateTime,
  totalPrice: number | null,
  period: ReportPeriod
): RentalSlice[] {
  const durationMs = endsAt.toMillis() - startsAt.toMillis()
  if (durationMs <= 0) return []

  const periodStart = DateTime.fromISO(period.from, { zone: 'utc' })
  const periodEnd = periodEndExclusive(period)
  const start = startsAt < periodStart ? periodStart : startsAt.toUTC()
  const end = endsAt > periodEnd ? periodEnd : endsAt.toUTC()
  if (end <= start) return []

  const slices: RentalSlice[] = []
  let cursor = start
  while (cursor < end) {
    const monthEnd = cursor.startOf('month').plus({ months: 1 })
    const sliceEnd = monthEnd < end ? monthEnd : end
    const ms = sliceEnd.toMillis() - cursor.toMillis()
    slices.push({
      month: cursor.toFormat('yyyy-MM'),
      days: ms / DAY_MS,
      revenue: totalPrice === null ? 0 : (totalPrice * ms) / durationMs,
    })
    cursor = sliceEnd
  }
  return slices
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? roundMoney(numerator / denominator) : null
}

export interface RawMetrics {
  costs: ReportCostBreakdown
  rentalRevenue: number
  invoicedPaid: number
  rentalDays: number
  engineHours: number
  distanceNm: number
}

export function emptyRawMetrics(): RawMetrics {
  return {
    costs: emptyCostBreakdown(),
    rentalRevenue: 0,
    invoicedPaid: 0,
    rentalDays: 0,
    engineHours: 0,
    distanceNm: 0,
  }
}

/** Ratios et arrondis d'un périmètre de `boatCount` bateaux sur `days` jours. */
export function finalizeMetrics(raw: RawMetrics, boatCount: number, days: number): ReportMetrics {
  const rentalRevenue = roundMoney(raw.rentalRevenue)
  const rentalDays = Math.round(raw.rentalDays * 10) / 10
  const capacity = boatCount * days
  return {
    costs: raw.costs,
    rentalRevenue,
    invoicedPaid: roundMoney(raw.invoicedPaid),
    margin: roundMoney(rentalRevenue - raw.costs.total),
    rentalDays,
    occupancyRate: capacity > 0 ? Math.min(100, Math.round((100 * raw.rentalDays) / capacity)) : 0,
    engineHours: Math.round(raw.engineHours * 10) / 10,
    distanceNm: Math.round(raw.distanceNm * 10) / 10,
    costPerEngineHour: ratio(raw.costs.total, raw.engineHours),
    costPerRentalDay: ratio(raw.costs.total, raw.rentalDays),
    costPerNauticalMile: ratio(raw.costs.total, raw.distanceNm),
  }
}
