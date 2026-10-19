import { INSTRUMENT_DEFAULT_VESSEL_CONTEXT, telemetryPathSpec } from '#shared/constants/instruments'
import type { JsonValue } from '#shared/types/notification'
import type { NormalizedSample, SignalKDelta } from './types'

/**
 * Delta Signal K → échantillons du catalogue (#989). Tout ce que le serveur ne
 * pourrait pas ingérer est écarté ici plutôt que de faire refuser un lot
 * entier (le serveur accepte ou refuse **tout** le lot) :
 *
 * - chemins hors catalogue ;
 * - `null` (le spike a vu `headingTrue` à `null` : ne pas écraser la dernière
 *   valeur connue) et valeurs non finies ;
 * - mauvais genre de valeur pour le chemin (objet sur un chemin numérique…).
 */

export interface NormalizeOptions {
  /** Contexte configuré sur la source (`vessels.self`). */
  context?: string
  /** `self` annoncé par le message `hello` du serveur. */
  selfContext?: string | null
}

function contextAccepted(delta: SignalKDelta, options: NormalizeOptions): boolean {
  if (!delta.context) return true
  if (delta.context === (options.context ?? INSTRUMENT_DEFAULT_VESSEL_CONTEXT)) return true
  return options.selfContext !== null && options.selfContext !== undefined
    ? delta.context === options.selfContext
    : false
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** `{ latitude, longitude }` finis, ou `null`. */
function normalizePosition(value: unknown): JsonValue | null {
  if (!isRecord(value)) return null
  const { latitude, longitude } = value
  if (!finite(latitude) || !finite(longitude)) return null
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null
  return { latitude, longitude }
}

/** Alarme réduite à `{ state, message, method }` : le reste du nœud est du bruit. */
function normalizeNotification(value: unknown): JsonValue | null {
  if (!isRecord(value)) return null
  const state = typeof value.state === 'string' ? value.state : null
  if (state === null) return null
  const method = Array.isArray(value.method)
    ? value.method.filter((item): item is string => typeof item === 'string')
    : []
  return {
    state,
    message: typeof value.message === 'string' ? value.message : null,
    method,
  }
}

export function normalizeDelta(
  delta: SignalKDelta,
  options: NormalizeOptions = {}
): NormalizedSample[] {
  if (!contextAccepted(delta, options)) return []

  const samples: NormalizedSample[] = []
  for (const update of delta.updates ?? []) {
    for (const entry of update.values ?? []) {
      const spec = telemetryPathSpec(entry.path)
      if (!spec || entry.value === null || entry.value === undefined) continue

      const signalkTimestamp = typeof update.timestamp === 'string' ? update.timestamp : null
      if (spec.valueKind === 'number') {
        if (!finite(entry.value)) continue
        samples.push({ path: entry.path, value: entry.value, valueJson: null, signalkTimestamp })
        continue
      }

      const valueJson = entry.path.startsWith('notifications.')
        ? normalizeNotification(entry.value)
        : normalizePosition(entry.value)
      if (valueJson === null) continue
      samples.push({ path: entry.path, value: null, valueJson, signalkTimestamp })
    }
  }
  return samples
}
