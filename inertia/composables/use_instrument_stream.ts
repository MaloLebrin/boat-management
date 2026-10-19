import { computed, getCurrentInstance, onBeforeUnmount, ref } from 'vue'
import { createSignalKClient, type SignalKClient } from '~/lib/signalk/client'
import { normalizeDelta } from '~/lib/signalk/sample_normalizer'
import type {
  NormalizedSample,
  SignalKConnectionState,
  SignalKErrorKey,
  SignalKTransport,
  WebSocketLike,
} from '~/lib/signalk/types'
import type { JsonValue } from '#shared/types/notification'
import type { InstrumentSourceConnection } from '#shared/types/instruments'

/** Au-delà, une valeur est « périmée » dans l'UI (badge, PR 3). */
export const DEFAULT_STALE_AFTER_S = 120

export interface LatestStreamValue {
  value: number | null
  valueJson: JsonValue | null
  receivedAt: number
}

export interface InstrumentStreamOptions {
  source: () => Pick<
    InstrumentSourceConnection,
    'baseUrl' | 'token' | 'vesselContext' | 'enabled'
  > | null
  /** Appelé pour chaque delta normalisé — branché sur `useTelemetrySync().push`. */
  onSamples?: (samples: NormalizedSample[]) => void
  staleAfterS?: number
  transport?: SignalKTransport
}

function browserTransport(): SignalKTransport {
  return {
    fetch: (input, init) => fetch(input, init),
    createWebSocket: (url) => new WebSocket(url) as unknown as WebSocketLike,
  }
}

/**
 * Flux temps réel d'un serveur Signal K (#989). Les valeurs vivent le temps de
 * l'écran : l'acquisition s'arrête dès que la page passe en arrière-plan (iOS
 * coupe le JS de toute façon, cf. `use_gps_burst.ts`) et reprend au retour.
 * Un Screen Wake Lock garde l'écran allumé pendant le flux.
 *
 * Jamais instancié côté serveur : `start()` est sans effet sans `window`.
 */
export function useInstrumentStream(options: InstrumentStreamOptions) {
  const connectionState = ref<SignalKConnectionState>('idle')
  const errorKey = ref<SignalKErrorKey | null>(null)
  const latestByPath = ref<Record<string, LatestStreamValue>>({})
  const lastDeltaAt = ref<number | null>(null)
  const clock = ref(Date.now())
  const staleAfterMs = (options.staleAfterS ?? DEFAULT_STALE_AFTER_S) * 1000

  let client: SignalKClient | null = null
  let wanted = false
  let clockTimer: ReturnType<typeof setInterval> | null = null
  let wakeLock: { release(): Promise<void> } | null = null

  /** Valeurs reçues depuis trop longtemps : l'UI les marque périmées. */
  const staleSince = computed(() => {
    const result: Record<string, boolean> = {}
    for (const [path, entry] of Object.entries(latestByPath.value)) {
      result[path] = clock.value - entry.receivedAt > staleAfterMs
    }
    return result
  })

  async function acquireWakeLock() {
    const api = typeof navigator === 'undefined' ? undefined : navigator.wakeLock
    if (!api || wakeLock) return
    try {
      wakeLock = await api.request('screen')
    } catch {
      // Refusé (batterie faible, onglet masqué) : le flux marche sans.
    }
  }

  async function releaseWakeLock() {
    const lock = wakeLock
    wakeLock = null
    try {
      await lock?.release()
    } catch {
      // déjà relâché par le navigateur
    }
  }

  function connectClient() {
    const source = options.source()
    if (!source || !source.enabled) return
    client = createSignalKClient({
      baseUrl: source.baseUrl,
      token: source.token,
      context: source.vesselContext,
      transport: options.transport ?? browserTransport(),
      onState: (state, key) => {
        connectionState.value = state
        errorKey.value = key
      },
      onDelta: (delta, self) => {
        const samples = normalizeDelta(delta, { context: source.vesselContext, selfContext: self })
        if (samples.length === 0) return
        const receivedAt = Date.now()
        lastDeltaAt.value = receivedAt
        const next = { ...latestByPath.value }
        for (const sample of samples) {
          next[sample.path] = { value: sample.value, valueJson: sample.valueJson, receivedAt }
        }
        latestByPath.value = next
        options.onSamples?.(samples)
      },
    })
    client.connect()
  }

  function onVisibility() {
    if (!wanted) return
    if (document.visibilityState === 'hidden') {
      client?.disconnect()
      client = null
      void releaseWakeLock()
      return
    }
    if (!client) {
      connectClient()
      void acquireWakeLock()
    }
  }

  function start() {
    if (typeof window === 'undefined' || wanted) return
    wanted = true
    clockTimer = setInterval(() => (clock.value = Date.now()), 1000)
    document.addEventListener('visibilitychange', onVisibility)
    connectClient()
    void acquireWakeLock()
  }

  function stop() {
    if (!wanted) return
    wanted = false
    if (clockTimer !== null) clearInterval(clockTimer)
    clockTimer = null
    document.removeEventListener('visibilitychange', onVisibility)
    client?.disconnect()
    client = null
    void releaseWakeLock()
  }

  if (getCurrentInstance()) onBeforeUnmount(stop)

  return { connectionState, errorKey, latestByPath, lastDeltaAt, staleSince, start, stop }
}
