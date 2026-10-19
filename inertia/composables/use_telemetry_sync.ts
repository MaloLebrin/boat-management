import { router } from '@inertiajs/vue3'
import { onBeforeUnmount, ref } from 'vue'
import { useOfflineQueue } from '~/composables/use_offline_queue'
import {
  OFFLINE_BATCH_BUCKET_MS,
  chunkSamples,
  coarsen,
  createAggregator,
  type Aggregator,
} from '~/lib/signalk/aggregator'
import { clearWindow, loadWindow, saveWindow } from '~/lib/signalk/instrument_store'
import type { NormalizedSample } from '~/lib/signalk/types'
import { INGEST_TELEMETRY_ACTION } from '#shared/constants/offline_queue'
import type { TelemetryBatchPayload, TelemetrySampleInput } from '#shared/types/instruments'

/** Cadence d'envoi en ligne. */
export const TELEMETRY_FLUSH_INTERVAL_MS = 60_000

/**
 * Plafond de lots de télémétrie en attente dans la file (#989) : à raison d'un
 * lot par demi-heure hors-ligne, 96 lots couvrent deux jours. Au-delà, les
 * nouveaux lots sont fondus plutôt qu'empilés.
 */
export const MAX_PENDING_TELEMETRY_BATCHES = 96

export interface TelemetrySyncOptions {
  boatId: () => number
  sourceId: () => number | null
  flushIntervalMs?: number
  now?: () => number
}

function newBatchId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `b_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

function readOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

/**
 * Agrège les échantillons du flux Signal K et les envoie à FleetAi (#989,
 * décisions D4/D5) :
 *
 * - **en ligne** : `router.post` avec `only: ['instruments']`, pour que la
 *   redirection ne rende que la prop différée et non toute la fiche ;
 * - **hors-ligne ou échec transitoire** : `enqueue` silencieux dans la file
 *   existante, rejoué au retour du réseau. Le serveur est idempotent, un lot
 *   rejoué deux fois n'insère rien de plus.
 *
 * Jamais instancié côté serveur : les timers et IndexedDB n'existent qu'au
 * navigateur.
 */
export function useTelemetrySync(options: TelemetrySyncOptions) {
  const { enqueue, pendingActions } = useOfflineQueue()
  const now = options.now ?? (() => Date.now())
  const flushIntervalMs = options.flushIntervalMs ?? TELEMETRY_FLUSH_INTERVAL_MS

  const running = ref(false)
  let aggregator: Aggregator | null = null
  let held: TelemetrySampleInput[][] = []
  let timer: ReturnType<typeof setInterval> | null = null
  let lastOfflineFlush = 0

  function pendingTelemetryBatches(): number {
    return pendingActions.value.filter((action) => action.type === INGEST_TELEMETRY_ACTION).length
  }

  function url(): string {
    return `/boats/${options.boatId()}/telemetry`
  }

  /** Enfile en silence, ou garde fondu en mémoire quand la file est pleine. */
  async function queueBatch(payload: TelemetryBatchPayload) {
    if (pendingTelemetryBatches() >= MAX_PENDING_TELEMETRY_BATCHES) {
      held = coarsen([...held, payload.samples], 1)
      return
    }
    const stored = await enqueue({
      type: INGEST_TELEMETRY_ACTION,
      url: url(),
      method: 'post',
      payload: payload as unknown as Record<string, never>,
      silent: true,
    })
    // Sans IndexedDB le lot serait perdu : on le garde en mémoire.
    if (!stored) held = coarsen([...held, payload.samples], 1)
  }

  function postOnline(payload: TelemetryBatchPayload): Promise<void> {
    return new Promise((resolve) => {
      let settled = false
      router.post(url(), payload as unknown as Record<string, never>, {
        preserveState: true,
        preserveScroll: true,
        only: ['instruments'],
        // Succès, ou refus métier (`rejectedType` flashé) : renvoyer le même lot
        // donnerait le même refus, on ne l'enfile pas.
        onSuccess: () => {
          settled = true
        },
        onError: () => {
          // Validation (forme du lot) : renvoyer le même lot échouerait pareil.
          settled = true
        },
        onFinish: () => {
          if (!settled) void queueBatch(payload).then(() => resolve())
          else resolve()
        },
      })
    })
  }

  async function send(samples: TelemetrySampleInput[]) {
    const sourceId = options.sourceId()
    if (sourceId === null) return
    const payload: TelemetryBatchPayload = { sourceId, batchId: newBatchId(), samples }
    if (!readOnline()) {
      await queueBatch(payload)
      return
    }
    await postOnline(payload)
  }

  async function persist() {
    const sourceId = options.sourceId()
    if (sourceId === null || !aggregator) return
    await saveWindow({
      sourceId,
      snapshot: aggregator.snapshot(),
      held,
      savedAt: new Date(now()).toISOString(),
    })
  }

  /** Vide ce qui est prêt. `force` : page masquée ou démontée, on envoie aussi la fenêtre ouverte. */
  async function flush(flushOptions: { force?: boolean } = {}) {
    if (!aggregator) return
    const online = readOnline()
    aggregator.setMode(online ? 'online' : 'offline')

    // Hors-ligne : un lot par demi-heure, pas toutes les minutes.
    if (!online && !flushOptions.force && now() - lastOfflineFlush < OFFLINE_BATCH_BUCKET_MS) {
      await persist()
      return
    }

    const ready = aggregator.flush(now(), flushOptions)
    const heldBatches = held
    held = []
    const samples = [...heldBatches.flat(), ...ready]
    if (!online) lastOfflineFlush = now()
    for (const chunk of chunkSamples(samples)) {
      await send(chunk)
    }
    await persist()
  }

  /** Reçoit les échantillons normalisés du flux. */
  function push(samples: NormalizedSample[], atMs: number = now()) {
    if (!aggregator) return
    for (const sample of samples) {
      aggregator.push(sample.path, { value: sample.value, valueJson: sample.valueJson }, atMs)
    }
  }

  function onOnline() {
    aggregator?.setMode('online')
    void flush()
  }

  function onVisibility() {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      void flush({ force: true })
    }
  }

  async function start() {
    if (running.value || typeof window === 'undefined') return
    const sourceId = options.sourceId()
    const restored = sourceId === null ? null : await loadWindow(sourceId)
    aggregator = createAggregator(restored?.snapshot)
    held = restored?.held ?? []
    aggregator.setMode(readOnline() ? 'online' : 'offline')
    running.value = true
    timer = setInterval(() => void flush(), flushIntervalMs)
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisibility)
  }

  async function stop() {
    if (!running.value) return
    running.value = false
    if (timer !== null) clearInterval(timer)
    timer = null
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisibility)
    await flush({ force: true })
  }

  /** Oublie le brouillon (source supprimée ou changée). */
  async function reset() {
    const sourceId = options.sourceId()
    held = []
    aggregator = createAggregator()
    if (sourceId !== null) await clearWindow(sourceId)
  }

  onBeforeUnmount(() => void stop())

  return { running, start, stop, push, flush, reset }
}
