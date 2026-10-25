import type { WeatherRangeHours } from '#shared/types/weather'

/** Au-delà, les prévisions gardées sont marquées « périmées » (D : 12 h, #1010). */
export const WEATHER_STALE_AFTER_MS = 12 * 3_600_000

export const WEATHER_RANGES: readonly WeatherRangeHours[] = [24, 48, 72]
export const WEATHER_DEFAULT_RANGE: WeatherRangeHours = 24

/** Créneaux demandés au fournisseur (horaires : couvre 72 h). */
export const WEATHER_FORECAST_COUNT = 72

/** Le créneau en cours a commencé il y a au plus cette durée. */
export const WEATHER_CURRENT_SLOT_MS = 3_600_000

export const WEATHER_API_PATH = '/signalk/v2/api/weather'
