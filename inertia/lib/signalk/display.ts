import { INSTRUMENT_PATH_CATALOG, telemetryPathSpec } from '#shared/constants/instruments'
import type { InstrumentCategory, TelemetryLatestValue } from '#shared/types/instruments'
import type { JsonValue } from '#shared/types/notification'
import { toDisplayUnit } from './units'

/**
 * Lectures prêtes à afficher (#990) : la dernière valeur connue du serveur,
 * remplacée par la valeur du flux en direct quand elle existe, convertie vers
 * l'unité d'affichage du catalogue (D8 : le SI reste en base).
 */

export const CATEGORY_ORDER: readonly InstrumentCategory[] = [
  'propulsion',
  'navigation',
  'environment',
  'electrical',
  'tanks',
  'notifications',
]

/** Au-delà de cet âge, une valeur est marquée « périmée ». */
export const STALE_AFTER_MS = 120_000

export interface LiveValue {
  value: number | null
  valueJson: JsonValue | null
  receivedAt: number
}

export interface InstrumentReading {
  path: string
  category: InstrumentCategory
  /** Clé i18n du libellé (`instruments.path.<motif>`). */
  labelKey: string
  /** Segment libre du chemin (moteur, batterie, réservoir) : `port`, `house`, `fuel · 0`. */
  instance: string
  value: number | null
  displayUnit: string | null
  valueJson: JsonValue | null
  /** Horodatage en millisecondes (réception en direct, ou `recordedAt` du serveur). */
  at: number
  live: boolean
}

function isFreeSegment(segment: string): boolean {
  return segment.startsWith('<') && segment.endsWith('>')
}

/** `propulsion.<id>.runTime` → `propulsion_runTime`. */
export function pathLabelSlug(pattern: string): string {
  return pattern
    .split('.')
    .filter((segment) => !isFreeSegment(segment))
    .join('_')
}

/** Les segments libres d'un chemin réel, ou le reste du chemin pour une alarme. */
function instanceOf(path: string, pattern: string): string {
  const segments = path.split('.')
  if (pattern === 'notifications.<path>') return segments.slice(1).join('.')
  return pattern
    .split('.')
    .map((segment, index) => (isFreeSegment(segment) ? segments[index] : null))
    .filter((segment): segment is string => segment !== null)
    .join(' · ')
}

export function toReading(
  path: string,
  entry: { value: number | null; valueJson: JsonValue | null; at: number; live: boolean }
): InstrumentReading | null {
  const spec = telemetryPathSpec(path)
  if (!spec) return null
  return {
    path,
    category: spec.category,
    labelKey: `instruments.path.${pathLabelSlug(spec.pattern)}`,
    instance: instanceOf(path, spec.pattern),
    value: entry.value === null ? null : toDisplayUnit(spec.displayUnit, entry.value),
    displayUnit: spec.displayUnit,
    valueJson: entry.valueJson,
    at: entry.at,
    live: entry.live,
  }
}

export function buildReadings(
  known: readonly TelemetryLatestValue[],
  live: Readonly<Record<string, LiveValue>>
): InstrumentReading[] {
  const byPath = new Map<string, InstrumentReading>()

  for (const entry of known) {
    const reading = toReading(entry.path, {
      value: entry.value,
      valueJson: entry.valueJson,
      at: Date.parse(entry.recordedAt),
      live: false,
    })
    if (reading) byPath.set(entry.path, reading)
  }
  for (const [path, entry] of Object.entries(live)) {
    const reading = toReading(path, { ...entry, at: entry.receivedAt, live: true })
    if (reading) byPath.set(path, reading)
  }

  return [...byPath.values()].sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      a.path.localeCompare(b.path)
  )
}

export function isStale(reading: InstrumentReading, now: number): boolean {
  return now - reading.at > STALE_AFTER_MS
}

/** Décimales d'affichage par unité. */
export function fractionDigits(unit: string | null): number {
  switch (unit) {
    case 'rpm':
    case '%':
    case '°':
    case 'L':
    case 'hPa':
      return 0
    case 'bar':
    case 'V':
      return 2
    default:
      return 1
  }
}

/** Les motifs du catalogue, pour vérifier que chacun a son libellé. */
export function catalogLabelKeys(): string[] {
  return INSTRUMENT_PATH_CATALOG.map((spec) => `instruments.path.${pathLabelSlug(spec.pattern)}`)
}
