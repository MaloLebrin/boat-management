import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  fetchWeatherForecast,
  isForecastStale,
  readForecastCache,
  writeForecastCache,
  type WeatherStorage,
} from '~/lib/signalk/weather'
import { isMixedContent } from '~/lib/signalk/url_security'
import type { SignalKTransport } from '~/lib/signalk/types'
import type { InstrumentSourceConnection } from '#shared/types/instruments'
import type { WeatherErrorKey, WeatherForecastSnapshot } from '#shared/types/weather'

/** Une nouvelle récupération automatique n'a lieu qu'au-delà de ce délai. */
export const FORECAST_REFRESH_AFTER_MS = 30 * 60_000

export interface SignalKForecastOptions {
  boatId: () => number
  source: () => Pick<InstrumentSourceConnection, 'baseUrl' | 'token' | 'enabled'> | null
  position: () => { latitude: number; longitude: number } | null
  transport?: SignalKTransport
  /** `location.protocol` de la page (contenu mixte, #1019). */
  pageProtocol?: () => string | undefined
  storage?: WeatherStorage | null
}

function browserStorage(): WeatherStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/**
 * Prévisions du serveur Signal K du bord (#1010). Récupérées par REST au
 * montage, quand la position est connue, puis rafraîchies à la demande ; la
 * dernière réponse reste lisible hors-ligne (cache local, périmée après 12 h).
 */
export function useSignalKForecast(options: SignalKForecastOptions) {
  const storage = options.storage === undefined ? browserStorage() : options.storage
  const snapshot = ref<WeatherForecastSnapshot | null>(null)
  const error = ref<WeatherErrorKey | null>(null)
  const loading = ref(false)
  const now = ref(Date.now())
  let clock: ReturnType<typeof setInterval> | null = null
  let generation = 0

  const stale = computed(() =>
    snapshot.value ? isForecastStale(snapshot.value, now.value) : false
  )

  async function refresh() {
    const source = options.source()
    if (!source?.enabled) return
    // Contenu mixte : le navigateur bloquerait l'appel, le cache local reste affiché.
    if (isMixedContent(source.baseUrl, options.pageProtocol?.())) return
    const position = options.position()
    if (!position) {
      error.value = 'no_position'
      return
    }
    const current = ++generation
    loading.value = true
    const transport = options.transport ?? { fetch: (input, init) => fetch(input, init) }
    const result = await fetchWeatherForecast(
      { baseUrl: source.baseUrl, token: source.token, ...position },
      transport as SignalKTransport
    )
    if (current !== generation) return
    loading.value = false
    now.value = Date.now()
    if (result.ok) {
      snapshot.value = result.snapshot
      error.value = null
      writeForecastCache(storage, options.boatId(), result.snapshot)
    } else {
      // Les prévisions en cache restent affichées : l'erreur s'ajoute, ne remplace pas.
      error.value = result.error
    }
  }

  /** Au montage et quand la position arrive : récupère si le cache est trop vieux. */
  async function refreshIfDue() {
    if (loading.value) return
    const cached = snapshot.value
    if (cached && Date.now() - cached.fetchedAt < FORECAST_REFRESH_AFTER_MS) return
    await refresh()
  }

  function start() {
    snapshot.value = readForecastCache(storage, options.boatId())
    clock = setInterval(() => (now.value = Date.now()), 60_000)
    void refreshIfDue()
  }

  function stop() {
    generation += 1
    if (clock !== null) clearInterval(clock)
    clock = null
  }

  if (getCurrentInstance()) {
    onMounted(start)
    onBeforeUnmount(stop)
  }

  return { snapshot, error, loading, stale, now, refresh, refreshIfDue, start, stop }
}
