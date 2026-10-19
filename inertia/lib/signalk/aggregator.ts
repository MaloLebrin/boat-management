import { TELEMETRY_MAX_BATCH_SIZE } from '#shared/constants/instruments'
import type { TelemetrySampleInput } from '#shared/types/instruments'
import type { JsonValue } from '#shared/types/notification'
import { ruleForPath, type AggregateKind } from './path_catalog'

/**
 * Sous-échantillonnage côté client (#989) : une valeur par chemin et par
 * fenêtre, réduite selon la règle du chemin (`last` / `mean` / `max`).
 *
 * Datation (décision D9) : `recordedAt` est l'**horloge de l'appareil**
 * arrondie au début de la fenêtre — jamais le `timestamp` Signal K, qui est
 * celui de la phrase NMEA et peut être n'importe quand. Arrondir rend aussi
 * le rejeu idempotent : la même fenêtre redonne le même `(path, recorded_at)`.
 */

export type AggregatorMode = 'online' | 'offline'

/** Fenêtre minimale hors-ligne : 5 minutes. */
export const OFFLINE_WINDOW_MS = 5 * 60_000

/** Hors-ligne, les échantillons partent par lots d'une demi-heure. */
export const OFFLINE_BATCH_BUCKET_MS = 30 * 60_000

interface WindowState {
  path: string
  startMs: number
  windowMs: number
  aggregate: AggregateKind
  count: number
  sum: number
  max: number
  last: number | null
  json: JsonValue | null
}

export interface AggregatorSnapshot {
  open: WindowState[]
  ready: TelemetrySampleInput[]
}

function toSample(state: WindowState): TelemetrySampleInput {
  const recordedAt = new Date(state.startMs).toISOString()
  if (state.json !== null) return { path: state.path, recordedAt, valueJson: state.json }

  let value = state.last
  if (state.aggregate === 'mean' && state.count > 0) value = state.sum / state.count
  if (state.aggregate === 'max' && state.count > 0) value = state.max
  return { path: state.path, recordedAt, value }
}

export function createAggregator(initial?: AggregatorSnapshot) {
  let mode: AggregatorMode = 'online'
  const open = new Map<string, WindowState>()
  let ready: TelemetrySampleInput[] = []

  for (const state of initial?.open ?? []) open.set(state.path, state)
  ready = [...(initial?.ready ?? [])]

  function windowFor(path: string): { windowMs: number; aggregate: AggregateKind } {
    const rule = ruleForPath(path)
    const base = rule.intervalS * 1000
    // `0` : chaque changement compte (alarmes). Hors-ligne on garde quand même
    // la fenêtre de 5 minutes pour les mesures, pas pour les alarmes.
    if (base === 0) return { windowMs: 1000, aggregate: rule.aggregate }
    return {
      windowMs: mode === 'offline' ? Math.max(base, OFFLINE_WINDOW_MS) : base,
      aggregate: rule.aggregate,
    }
  }

  function push(
    path: string,
    sample: { value: number | null; valueJson: JsonValue | null },
    atMs: number
  ) {
    const { windowMs, aggregate } = windowFor(path)
    const startMs = Math.floor(atMs / windowMs) * windowMs
    const current = open.get(path)

    // Fenêtre dépassée : elle est close, la nouvelle repart de zéro.
    if (current && current.startMs !== startMs) {
      ready.push(toSample(current))
      open.delete(path)
    }

    let state = open.get(path)
    if (!state) {
      state = {
        path,
        startMs,
        windowMs,
        aggregate,
        count: 0,
        sum: 0,
        max: Number.NEGATIVE_INFINITY,
        last: null,
        json: null,
      }
      open.set(path, state)
    }

    if (sample.valueJson !== null) {
      state.json = sample.valueJson
      return
    }
    if (sample.value === null) return
    state.count += 1
    state.sum += sample.value
    state.max = Math.max(state.max, sample.value)
    state.last = sample.value
  }

  /**
   * Les échantillons prêts. Sans `force`, seules les fenêtres closes partent ;
   * `force` (page masquée, déchargement) vide aussi les fenêtres en cours — si
   * la même fenêtre se rouvre ensuite, son second envoi sera ignoré par la
   * contrainte unique du serveur (premier arrivé, premier gardé).
   */
  function flush(nowMs: number, options: { force?: boolean } = {}): TelemetrySampleInput[] {
    for (const [path, state] of open) {
      if (options.force || state.startMs + state.windowMs <= nowMs) {
        ready.push(toSample(state))
        open.delete(path)
      }
    }
    const out = ready
    ready = []
    return out
  }

  /** Les fenêtres déjà ouvertes gardent leur durée ; seules les suivantes changent. */
  function setMode(next: AggregatorMode) {
    mode = next
  }

  function getMode(): AggregatorMode {
    return mode
  }

  function snapshot(): AggregatorSnapshot {
    return { open: [...open.values()], ready: [...ready] }
  }

  return { push, flush, setMode, getMode, snapshot }
}

export type Aggregator = ReturnType<typeof createAggregator>

/** Découpe en lots que le serveur acceptera (≤ 500 échantillons). */
export function chunkSamples(
  samples: TelemetrySampleInput[],
  size: number = TELEMETRY_MAX_BATCH_SIZE
): TelemetrySampleInput[][] {
  const chunks: TelemetrySampleInput[][] = []
  for (let index = 0; index < samples.length; index += size) {
    chunks.push(samples.slice(index, index + size))
  }
  return chunks
}

/**
 * Plafond de lots en attente atteint (#989) : les plus anciens sont fondus en
 * un seul lot grossier — une valeur par chemin et par demi-heure (moyenne des
 * mesures, dernière valeur des structurées). On perd en résolution, jamais en
 * couverture : après des semaines en mer, c'est l'historique qui compte, pas
 * la seconde.
 */
export function coarsen(
  batches: TelemetrySampleInput[][],
  maxBatches: number,
  bucketMs: number = OFFLINE_BATCH_BUCKET_MS
): TelemetrySampleInput[][] {
  if (batches.length <= maxBatches || maxBatches < 1) return batches

  const mergeCount = batches.length - maxBatches + 1
  const buckets = new Map<
    string,
    { path: string; startMs: number; values: number[]; json: JsonValue | null }
  >()

  for (const sample of batches.slice(0, mergeCount).flat()) {
    const startMs = Math.floor(Date.parse(sample.recordedAt) / bucketMs) * bucketMs
    const key = `${sample.path}@${startMs}`
    const bucket = buckets.get(key) ?? { path: sample.path, startMs, values: [], json: null }
    if (sample.valueJson !== undefined && sample.valueJson !== null) bucket.json = sample.valueJson
    else if (typeof sample.value === 'number') bucket.values.push(sample.value)
    buckets.set(key, bucket)
  }

  const merged: TelemetrySampleInput[] = [...buckets.values()]
    .sort((a, b) => a.startMs - b.startMs)
    .map((bucket) => {
      const recordedAt = new Date(bucket.startMs).toISOString()
      if (bucket.json !== null) return { path: bucket.path, recordedAt, valueJson: bucket.json }
      const mean = bucket.values.reduce((sum, v) => sum + v, 0) / (bucket.values.length || 1)
      return { path: bucket.path, recordedAt, value: mean }
    })

  return [...chunkSamples(merged), ...batches.slice(mergeCount)]
}
