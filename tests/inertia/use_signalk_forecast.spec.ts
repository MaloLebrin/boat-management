import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  FORECAST_REFRESH_AFTER_MS,
  useSignalKForecast,
} from '../../inertia/composables/use_signalk_forecast'
import type { WeatherStorage } from '../../inertia/lib/signalk/weather'
import type { SignalKTransport } from '../../inertia/lib/signalk/types'

const source = { baseUrl: 'http://boat.local:3000', token: null, enabled: true }
const position = { latitude: 43, longitude: 5 }

function transport(ok = true): SignalKTransport {
  return {
    fetch: vi.fn(async (url: string) => {
      if (!ok) throw new Error('offline')
      const body = url.includes('_providers')
        ? { om: { name: 'Open-Meteo', isDefault: true } }
        : [{ date: new Date(Date.now() + 3_600_000).toISOString(), wind: { speedTrue: 4 } }]
      return { ok: true, status: 200, json: async () => body }
    }),
    createWebSocket: () => {
      throw new Error('unused')
    },
  }
}

function memory(): WeatherStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useSignalKForecast (#1010)', () => {
  test('récupère, expose le snapshot et l’écrit en cache', async () => {
    const storage = memory()
    const forecast = useSignalKForecast({
      boatId: () => 3,
      source: () => source,
      position: () => position,
      transport: transport(),
      storage,
    })
    forecast.start()
    await vi.waitFor(() => expect(forecast.snapshot.value).not.toBeNull())
    expect(forecast.error.value).toBeNull()
    expect(storage.data.has('fleetai:signalk-forecast:3')).toBe(true)
    forecast.stop()
  })

  test('sans position : erreur no_position, aucun appel réseau', async () => {
    const t = transport()
    const forecast = useSignalKForecast({
      boatId: () => 3,
      source: () => source,
      position: () => null,
      transport: t,
      storage: memory(),
    })
    forecast.start()
    await vi.waitFor(() => expect(forecast.error.value).toBe('no_position'))
    expect(t.fetch).not.toHaveBeenCalled()
    forecast.stop()
  })

  test('source désactivée : rien ne part', async () => {
    const t = transport()
    const forecast = useSignalKForecast({
      boatId: () => 3,
      source: () => ({ ...source, enabled: false }),
      position: () => position,
      transport: t,
      storage: memory(),
    })
    await forecast.refresh()
    expect(t.fetch).not.toHaveBeenCalled()
  })

  test('hors ligne : le cache reste affiché avec l’erreur, périmé après 12 h', async () => {
    const storage = memory()
    const first = useSignalKForecast({
      boatId: () => 3,
      source: () => source,
      position: () => position,
      transport: transport(),
      storage,
    })
    await first.refresh()
    first.stop()

    vi.setSystemTime(Date.now() + 13 * 3_600_000)
    const second = useSignalKForecast({
      boatId: () => 3,
      source: () => source,
      position: () => position,
      transport: transport(false),
      storage,
    })
    second.start()
    await vi.waitFor(() => expect(second.error.value).toBe('unreachable'))
    expect(second.snapshot.value).not.toBeNull()
    expect(second.stale.value).toBe(true)
    second.stop()
  })

  test('cache récent : pas de nouvel appel avant le délai de rafraîchissement', async () => {
    const storage = memory()
    const seed = useSignalKForecast({
      boatId: () => 3,
      source: () => source,
      position: () => position,
      transport: transport(),
      storage,
    })
    await seed.refresh()
    const t = transport()
    const again = useSignalKForecast({
      boatId: () => 3,
      source: () => source,
      position: () => position,
      transport: t,
      storage,
    })
    again.start()
    await Promise.resolve()
    expect(t.fetch).not.toHaveBeenCalled()
    vi.setSystemTime(Date.now() + FORECAST_REFRESH_AFTER_MS + 1)
    await again.refreshIfDue()
    expect(t.fetch).toHaveBeenCalled()
    again.stop()
  })
})
