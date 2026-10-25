import { describe, expect, test, vi } from 'vitest'
import {
  buildMetricSeries,
  fetchWeatherForecast,
  isForecastStale,
  parseForecast,
  parsePosition,
  parseProviders,
  pickProvider,
  readForecastCache,
  summarize,
  windowPoints,
  writeForecastCache,
  type WeatherStorage,
} from '../../inertia/lib/signalk/weather'
import type { SignalKTransport } from '../../inertia/lib/signalk/types'
import type { WeatherForecastSnapshot } from '../../shared/types/weather'

const NOW = Date.parse('2026-10-25T12:00:00Z')
const hour = (h: number) => new Date(NOW + h * 3_600_000).toISOString()

function entry(h: number, extra: Record<string, unknown> = {}) {
  return {
    date: hour(h),
    wind: { speedTrue: 5.14444, gust: 10.28888, directionTrue: 1.5 },
    outside: { pressure: 101_300, temperature: 288.15, precipitationVolume: 0.0005 },
    water: { waves: { significantHeight: 1.2, period: 6 } },
    ...extra,
  }
}

function transport(routes: Record<string, { status?: number; body?: unknown } | 'throw'>) {
  const calls: string[] = []
  const impl: SignalKTransport = {
    fetch: vi.fn(async (url: string) => {
      calls.push(url)
      const route = Object.entries(routes).find(([key]) => url.includes(key))?.[1]
      if (route === 'throw' || !route) throw new Error('network')
      const status = route.status ?? 200
      return { ok: status < 400, status, json: async () => route.body }
    }),
    createWebSocket: () => {
      throw new Error('unused')
    },
  }
  return { impl, calls }
}

describe('parseProviders / pickProvider', () => {
  test('lit les fournisseurs et préfère celui par défaut', () => {
    const list = parseProviders({ a: { name: 'A' }, b: { name: 'B', isDefault: true } })
    expect(list).toEqual([
      { id: 'a', name: 'A', isDefault: false },
      { id: 'b', name: 'B', isDefault: true },
    ])
    expect(pickProvider(list)?.id).toBe('b')
  })

  test('sans défaut, prend le premier ; sans fournisseur, null', () => {
    expect(pickProvider(parseProviders({ x: {} }))?.name).toBe('x')
    expect(pickProvider(parseProviders(null))).toBeNull()
  })
})

describe('parseForecast', () => {
  test('lit vent, vagues, pression, pluie et trie par date', () => {
    const [first, second] = parseForecast([entry(2), entry(1)])
    expect(first.at).toBe(hour(1))
    expect(second.at).toBe(hour(2))
    expect(first).toMatchObject({
      windSpeedMs: 5.14444,
      windGustMs: 10.28888,
      waveHeightM: 1.2,
      wavePeriodS: 6,
      pressurePa: 101_300,
      precipitationM: 0.0005,
      temperatureK: 288.15,
    })
  })

  test('houle en repli, valeurs invalides en null, dates illisibles écartées', () => {
    const points = parseForecast([
      { date: hour(1), wind: { averageSpeed: 3, gust: 'x' }, water: { swell: { height: 2 } } },
      { date: 'pas une date' },
      { wind: {} },
      'junk',
    ])
    expect(points).toHaveLength(1)
    expect(points[0]).toMatchObject({ windSpeedMs: 3, windGustMs: null, waveHeightM: 2 })
    expect(parseForecast({ not: 'an array' })).toEqual([])
  })
})

describe('fetchWeatherForecast', () => {
  const query = { baseUrl: 'http://boat.local:3000', token: 'tok', latitude: 43.3, longitude: 5.4 }

  test('fournisseur par défaut : pas de paramètre provider', async () => {
    const { impl, calls } = transport({
      '_providers': { body: { om: { name: 'Open-Meteo', isDefault: true } } },
      'forecasts/point': { body: [entry(1)] },
    })
    const result = await fetchWeatherForecast(query, impl, NOW)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.snapshot).toMatchObject({ providerName: 'Open-Meteo', fetchedAt: NOW })
    }
    expect(calls[1]).toContain('/signalk/v2/api/weather/forecasts/point?lat=43.3&lon=5.4&count=72')
    expect(calls[1]).not.toContain('provider=')
    expect(impl.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: { Authorization: 'Bearer tok' } })
    )
  })

  test('fournisseur non défaut : nommé dans la requête', async () => {
    const { impl, calls } = transport({
      '_providers': { body: { mb: { name: 'Meteoblue' } } },
      'forecasts/point': { body: [entry(1)] },
    })
    await fetchWeatherForecast({ ...query, token: null }, impl, NOW)
    expect(calls[1]).toContain('provider=mb')
  })

  test.each([
    ['404 → unsupported', { _providers: { status: 404 } }, 'unsupported'],
    ['401 → unauthorized', { _providers: { status: 401 } }, 'unauthorized'],
    ['500 → unreachable', { _providers: { status: 500 } }, 'unreachable'],
    ['réseau → unreachable', { _providers: 'throw' }, 'unreachable'],
    ['aucun fournisseur', { _providers: { body: {} } }, 'no_provider'],
    [
      'prévision vide → invalid',
      { '_providers': { body: { a: {} } }, 'forecasts/point': { body: [] } },
      'invalid',
    ],
    [
      'prévision refusée',
      { '_providers': { body: { a: {} } }, 'forecasts/point': { status: 403 } },
      'unauthorized',
    ],
  ] as const)('%s', async (_name, routes, error) => {
    const { impl } = transport(routes as never)
    expect(await fetchWeatherForecast(query, impl, NOW)).toEqual({ ok: false, error })
  })
})

describe('fenêtre, séries et résumé', () => {
  const snapshot: WeatherForecastSnapshot = {
    fetchedAt: NOW,
    providerId: 'om',
    providerName: 'Open-Meteo',
    latitude: 43,
    longitude: 5,
    points: parseForecast([-3, -1, 0, 5, 24, 25, 50, 80].map((h) => entry(h))),
  }

  test('écarte les créneaux passés (hors créneau en cours) et au-delà de la plage', () => {
    const at = (hours: 24 | 48 | 72) =>
      windowPoints(snapshot, hours, NOW).map((point) => Date.parse(point.at) - NOW)
    expect(at(24)).toEqual([-1, 0, 5, 24].map((h) => h * 3_600_000))
    expect(at(48)).toHaveLength(5)
    expect(at(72)).toHaveLength(6)
  })

  test('séries en unités d’affichage, mesures absentes omises', () => {
    const series = buildMetricSeries(parseForecast([entry(1)]))
    expect(series.map((s) => s.key)).toEqual([
      'wind',
      'gust',
      'wave',
      'pressure',
      'rain',
      'temperature',
    ])
    const byKey = Object.fromEntries(series.map((s) => [s.key, s.points[0][1]]))
    expect(byKey.wind).toBeCloseTo(10, 1)
    expect(byKey.gust).toBeCloseTo(20, 1)
    expect(byKey.pressure).toBeCloseTo(1013, 0)
    expect(byKey.rain).toBeCloseTo(0.5, 5)
    expect(byKey.temperature).toBeCloseTo(15, 5)
    expect(buildMetricSeries(parseForecast([{ date: hour(1) }]))).toEqual([])
  })

  test('résumé : extrêmes et cumul de pluie', () => {
    const summary = summarize(
      parseForecast([entry(1), entry(2, { wind: { speedTrue: 10.28888 } })])
    )
    expect(summary.maxWindKn).toBeCloseTo(20, 1)
    expect(summary.maxGustKn).toBeCloseTo(20, 1)
    expect(summary.maxWaveM).toBe(1.2)
    expect(summary.totalRainMm).toBeCloseTo(1, 5)
    expect(summarize([])).toEqual({
      maxWindKn: null,
      maxGustKn: null,
      maxWaveM: null,
      minPressureHpa: null,
      maxPressureHpa: null,
      totalRainMm: null,
    })
  })

  test('périmé au-delà de 12 h', () => {
    expect(isForecastStale(snapshot, NOW + 12 * 3_600_000)).toBe(false)
    expect(isForecastStale(snapshot, NOW + 12 * 3_600_000 + 1)).toBe(true)
  })
})

describe('cache local', () => {
  function memory(): WeatherStorage & { data: Map<string, string> } {
    const data = new Map<string, string>()
    return {
      data,
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => void data.set(key, value),
    }
  }
  const snapshot: WeatherForecastSnapshot = {
    fetchedAt: NOW,
    providerId: 'om',
    providerName: 'Open-Meteo',
    latitude: 43,
    longitude: 5,
    points: parseForecast([entry(1)]),
  }

  test('aller-retour par bateau', () => {
    const storage = memory()
    writeForecastCache(storage, 7, snapshot)
    expect(readForecastCache(storage, 7)).toEqual(snapshot)
    expect(readForecastCache(storage, 8)).toBeNull()
  })

  test('contenu corrompu, incomplet ou stockage absent : null, sans lever', () => {
    const storage = memory()
    storage.data.set('fleetai:signalk-forecast:1', '{nope')
    storage.data.set('fleetai:signalk-forecast:2', JSON.stringify({ fetchedAt: 1, points: [] }))
    expect(readForecastCache(storage, 1)).toBeNull()
    expect(readForecastCache(storage, 2)).toBeNull()
    expect(readForecastCache(null, 1)).toBeNull()
    expect(() => writeForecastCache(null, 1, snapshot)).not.toThrow()
    const full: WeatherStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
    }
    expect(() => writeForecastCache(full, 1, snapshot)).not.toThrow()
  })
})

describe('parsePosition', () => {
  test('accepte une position valide, refuse le reste', () => {
    expect(parsePosition({ latitude: 43, longitude: 5 })).toEqual({ latitude: 43, longitude: 5 })
    expect(parsePosition({ latitude: 91, longitude: 5 })).toBeNull()
    expect(parsePosition({ latitude: 43, longitude: 181 })).toBeNull()
    expect(parsePosition(null)).toBeNull()
    expect(parsePosition({ latitude: '43', longitude: 5 })).toBeNull()
  })
})
