/**
 * Conversions d'unités Signal K (SI) vers l'affichage (#989, décision D8).
 * La base stocke le SI tel quel ; ces fonctions ne servent qu'à l'écran.
 * Piège : `revolutions` est en **hertz**, pas en tr/min.
 */

const KNOT_PER_MS = 3600 / 1852

export const msToKnots = (value: number) => value * KNOT_PER_MS
export const kelvinToCelsius = (value: number) => value - 273.15
export const radToDegrees = (value: number) => (value * 180) / Math.PI
export const ratioToPercent = (value: number) => value * 100
export const paToBar = (value: number) => value / 100_000
export const paToHectopascal = (value: number) => value / 100
export const secondsToHours = (value: number) => value / 3600
export const metersToNauticalMiles = (value: number) => value / 1852
export const hzToRpm = (value: number) => value * 60
export const cubicMetersToLiters = (value: number) => value * 1000
export const cubicMetersPerSecondToLitersPerHour = (value: number) => value * 3_600_000

/** Angle en degrés ramené dans [0, 360[. */
export function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360
}

const CONVERTERS: Record<string, (value: number) => number> = {
  'kn': msToKnots,
  '°C': kelvinToCelsius,
  '°': (value) => normalizeDegrees(radToDegrees(value)),
  '%': ratioToPercent,
  'bar': paToBar,
  'hPa': paToHectopascal,
  'h': secondsToHours,
  'rpm': hzToRpm,
  'L': cubicMetersToLiters,
  'L/h': cubicMetersPerSecondToLitersPerHour,
  'NM': metersToNauticalMiles,
  'V': (value) => value,
  'W': (value) => value,
  'A': (value) => value,
  'm': (value) => value,
}

/**
 * Convertit une valeur SI vers l'unité d'affichage du catalogue
 * (`InstrumentPathSpec.displayUnit`). Une unité inconnue rend la valeur telle
 * quelle plutôt que de la masquer.
 */
export function toDisplayUnit(displayUnit: string | null, value: number): number {
  if (displayUnit === null) return value
  return (CONVERTERS[displayUnit] ?? ((raw: number) => raw))(value)
}
