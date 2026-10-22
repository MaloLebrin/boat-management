import {
  TELEMETRY_SERIES_MAX_PATHS,
  TELEMETRY_SERIES_RANGES,
  telemetryPathSpec,
} from '#shared/constants/instruments'
import type { InstrumentSeriesQuery, TelemetrySeriesRange } from '#shared/types/instruments'

/**
 * Normalise l'adresse d'un serveur Signal K en **origine** (`https?://hôte[:port]`),
 * ou `null` si elle n'en est pas une (#988, D2).
 *
 * La valeur enregistrée est réinjectée telle quelle dans l'en-tête CSP de la
 * fiche bateau (`connect-src`) : elle ne doit donc jamais porter de chemin,
 * de paramètres, de fragment ni d'identifiants. Le port par défaut du schéma
 * est effacé par `URL#origin` (`https://h:443` → `https://h`), ce qui donne
 * une forme canonique pour la comparaison et pour la CSP.
 */
export function normalizeInstrumentBaseUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0 || trimmed.length > 255) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (url.username !== '' || url.password !== '') return null
  if (url.search !== '' || url.hash !== '') return null
  if (url.pathname !== '/' && url.pathname !== '') return null
  // Un `/` final est toléré à la saisie, mais rien d'autre après l'autorité.
  const authorityEnd = trimmed.indexOf('/', url.protocol.length + 2)
  if (authorityEnd !== -1 && authorityEnd !== trimmed.length - 1) return null
  if (url.hostname.length === 0) return null

  return url.origin
}

const SECONDS_PER_HOUR = 3600
const MS_TO_KNOTS = 1.943_84

/**
 * Ce que la synchronisation des heures moteur doit faire d'un `runTime` lu sur
 * le calculateur (#991, D6) :
 *
 * - `init` — aucune base : on la pose, sans incrémenter (le compteur absolu du
 *   calculateur n'a rien à voir avec `hours`, saisi à l'installation) ;
 * - `rebase` — `runTime` sous la base : le calculateur a été remis à zéro ou
 *   remplacé, on repart de la nouvelle valeur ;
 * - `increment` — au moins une heure entière écoulée depuis la base ;
 * - `none` — moins d'une heure : le reliquat attend le lot suivant.
 */
export type RunTimeSyncDecision =
  | { action: 'init'; baseS: number }
  | { action: 'rebase'; baseS: number }
  | { action: 'increment'; hours: number }
  | { action: 'none' }

export function decideRunTimeSync(runTimeS: number, baseS: number | null): RunTimeSyncDecision {
  const current = Math.floor(runTimeS)
  if (baseS === null) return { action: 'init', baseS: current }
  if (current < baseS) return { action: 'rebase', baseS: current }
  const hours = Math.floor((current - baseS) / SECONDS_PER_HOUR)
  return hours > 0 ? { action: 'increment', hours } : { action: 'none' }
}

/** Chemin Signal K du compteur d'heures d'un moteur. */
export function engineRunTimePath(instrumentKey: string): string {
  return `propulsion.${instrumentKey}.runTime`
}

/** m/s → nœuds, arrondi au centième. */
export function metersPerSecondToKnots(value: number): number {
  return Math.round(value * MS_TO_KNOTS * 100) / 100
}

/** Radians → degrés entiers dans [0, 360). */
export function radiansToDegrees(value: number): number {
  const degrees = Math.round((value * 180) / Math.PI) % 360
  return degrees < 0 ? degrees + 360 : degrees
}

/** Kelvin → °C, arrondi au dixième. */
export function kelvinToCelsius(value: number): number {
  return Math.round((value - 273.15) * 10) / 10
}

/**
 * Lit `range` et `paths[]` dans la requête de `boats.show` (#992). Une demande
 * invalide — plage inconnue, aucun chemin numérique du catalogue — vaut « pas
 * d'historique » : la page ne doit jamais échouer pour un paramètre de plus.
 */
export function parseSeriesQuery(qs: Record<string, unknown>): InstrumentSeriesQuery | null {
  const range = qs.range
  if (typeof range !== 'string' || !(range in TELEMETRY_SERIES_RANGES)) return null

  const raw = Array.isArray(qs.paths) ? qs.paths : typeof qs.paths === 'string' ? [qs.paths] : []
  const paths = [...new Set(raw)]
    .filter((path): path is string => typeof path === 'string')
    .filter((path) => telemetryPathSpec(path)?.valueKind === 'number')
    .slice(0, TELEMETRY_SERIES_MAX_PATHS)
  if (paths.length === 0) return null

  return { range: range as TelemetrySeriesRange, paths }
}
