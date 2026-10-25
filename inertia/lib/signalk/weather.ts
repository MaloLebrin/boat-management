import {
  WEATHER_API_PATH,
  WEATHER_CURRENT_SLOT_MS,
  WEATHER_FORECAST_COUNT,
  WEATHER_STALE_AFTER_MS,
} from '#shared/constants/weather'
import type {
  WeatherErrorKey,
  WeatherForecastPoint,
  WeatherForecastSnapshot,
  WeatherMetricSeries,
  WeatherProviderInfo,
  WeatherRangeHours,
  WeatherSummary,
} from '#shared/types/weather'
import type { SignalKTransport } from './types'
import { kelvinToCelsius, msToKnots, paToHectopascal } from './units'

/**
 * Prévisions de l'API Weather Signal K v2 (#1010) : lues par la PWA sur le
 * Wi-Fi du bord, jamais stockées en base. Pur — `fetch` et le stockage local
 * sont injectés.
 *
 * Forme attendue (spécification Signal K v2, non mesurée sur un serveur réel —
 * le parseur est donc tolérant : toute valeur absente ou non finie devient
 * `null`) :
 * - `GET …/weather/_providers` → `{ "<id>": { name, isDefault } }` ;
 * - `GET …/weather/forecasts/point?lat&lon&count[&provider]` → tableau de
 *   `{ date, wind: { speedTrue, gust, directionTrue }, outside: { pressure,
 *   temperature, precipitationVolume }, water: { waves | swell } }`, en SI.
 */

export interface WeatherStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface WeatherQuery {
  baseUrl: string
  token: string | null
  latitude: number
  longitude: number
}

export type WeatherFetchResult =
  | { ok: true; snapshot: WeatherForecastSnapshot }
  | { ok: false; error: WeatherErrorKey }

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function obj(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function parseProviders(body: unknown): WeatherProviderInfo[] {
  return Object.entries(obj(body)).map(([id, raw]) => {
    const info = obj(raw)
    return {
      id,
      name: typeof info.name === 'string' && info.name !== '' ? info.name : id,
      isDefault: info.isDefault === true,
    }
  })
}

/** Le fournisseur par défaut, sinon le premier ; `null` si aucun. */
export function pickProvider(providers: WeatherProviderInfo[]): WeatherProviderInfo | null {
  return providers.find((provider) => provider.isDefault) ?? providers[0] ?? null
}

export function parseForecast(body: unknown): WeatherForecastPoint[] {
  if (!Array.isArray(body)) return []
  const points: WeatherForecastPoint[] = []
  for (const entry of body) {
    const raw = obj(entry)
    const at = typeof raw.date === 'string' ? raw.date : null
    if (at === null || Number.isNaN(Date.parse(at))) continue
    const wind = obj(raw.wind)
    const outside = obj(raw.outside)
    const water = obj(raw.water)
    const waves = obj(water.waves)
    const swell = obj(water.swell)
    points.push({
      at: new Date(at).toISOString(),
      windSpeedMs: num(wind.speedTrue) ?? num(wind.averageSpeed),
      windGustMs: num(wind.gust),
      windDirectionRad: num(wind.directionTrue),
      waveHeightM:
        num(waves.significantHeight) ?? num(swell.height) ?? num(swell.significantHeight),
      wavePeriodS: num(waves.period) ?? num(swell.period),
      pressurePa: num(outside.pressure),
      precipitationM: num(outside.precipitationVolume),
      temperatureK: num(outside.temperature),
    })
  }
  return points.sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
}

function failure(status: number): WeatherErrorKey {
  if (status === 401 || status === 403) return 'unauthorized'
  if (status === 404) return 'unsupported'
  return 'unreachable'
}

/** Providers puis prévisions au point : deux appels REST, une position. */
export async function fetchWeatherForecast(
  query: WeatherQuery,
  transport: SignalKTransport,
  now: number = Date.now()
): Promise<WeatherFetchResult> {
  const headers: Record<string, string> = query.token
    ? { Authorization: `Bearer ${query.token}` }
    : {}
  const root = `${query.baseUrl}${WEATHER_API_PATH}`

  async function get(
    url: string
  ): Promise<{ error: WeatherErrorKey; body?: undefined } | { error?: undefined; body: unknown }> {
    try {
      const response = await transport.fetch(url, { headers })
      if (!response.ok) return { error: failure(response.status) }
      return { body: await response.json().catch(() => undefined) }
    } catch {
      return { error: 'unreachable' }
    }
  }

  const providersResponse = await get(`${root}/_providers`)
  if (providersResponse.error) return { ok: false, error: providersResponse.error }
  const providers = parseProviders(providersResponse.body)
  const provider = pickProvider(providers)
  if (!provider) return { ok: false, error: 'no_provider' }

  const params = new URLSearchParams({
    lat: String(query.latitude),
    lon: String(query.longitude),
    count: String(WEATHER_FORECAST_COUNT),
  })
  // Le fournisseur par défaut répond sans paramètre ; on ne nomme que les autres.
  if (!provider.isDefault) params.set('provider', provider.id)
  const forecastResponse = await get(`${root}/forecasts/point?${params.toString()}`)
  if (forecastResponse.error) return { ok: false, error: forecastResponse.error }
  const points = parseForecast(forecastResponse.body)
  if (points.length === 0) return { ok: false, error: 'invalid' }

  return {
    ok: true,
    snapshot: {
      fetchedAt: now,
      providerId: provider.id,
      providerName: provider.name,
      latitude: query.latitude,
      longitude: query.longitude,
      points,
    },
  }
}

export const isForecastStale = (snapshot: WeatherForecastSnapshot, now: number) =>
  now - snapshot.fetchedAt > WEATHER_STALE_AFTER_MS

/** Créneaux de « maintenant » à `hours` h : le créneau en cours est gardé, les passés non. */
export function windowPoints(
  snapshot: WeatherForecastSnapshot,
  hours: WeatherRangeHours,
  now: number
): WeatherForecastPoint[] {
  const from = now - WEATHER_CURRENT_SLOT_MS
  const to = now + hours * 3_600_000
  return snapshot.points.filter((point) => {
    const at = Date.parse(point.at)
    return at >= from && at <= to
  })
}

function series(
  key: WeatherMetricSeries['key'],
  unit: string,
  digits: number,
  points: WeatherForecastPoint[],
  pick: (point: WeatherForecastPoint) => number | null
): WeatherMetricSeries | null {
  const values = points.flatMap((point): Array<[string, number]> => {
    const value = pick(point)
    return value === null ? [] : [[point.at, value]]
  })
  return values.length > 0 ? { key, unit, digits, points: values } : null
}

/** Une série par mesure disponible, en unité d'affichage. */
export function buildMetricSeries(points: WeatherForecastPoint[]): WeatherMetricSeries[] {
  const conv = (fn: (value: number) => number) => (value: number | null) =>
    value === null ? null : fn(value)
  const wind = conv(msToKnots)
  const pressure = conv(paToHectopascal)
  const rain = conv((value) => value * 1000)
  const temperature = conv(kelvinToCelsius)
  return [
    series('wind', 'kn', 0, points, (p) => wind(p.windSpeedMs)),
    series('gust', 'kn', 0, points, (p) => wind(p.windGustMs)),
    series('wave', 'm', 1, points, (p) => p.waveHeightM),
    series('pressure', 'hPa', 0, points, (p) => pressure(p.pressurePa)),
    series('rain', 'mm', 1, points, (p) => rain(p.precipitationM)),
    series('temperature', '°C', 0, points, (p) => temperature(p.temperatureK)),
  ].filter((entry): entry is WeatherMetricSeries => entry !== null)
}

function extreme(values: number[], pick: (...values: number[]) => number): number | null {
  return values.length > 0 ? pick(...values) : null
}

const present = (values: Array<number | null>) =>
  values.filter((value): value is number => value !== null)

export function summarize(points: WeatherForecastPoint[]): WeatherSummary {
  const wind = present(points.map((p) => p.windSpeedMs))
  const gust = present(points.map((p) => p.windGustMs))
  const wave = present(points.map((p) => p.waveHeightM))
  const pressure = present(points.map((p) => p.pressurePa))
  const rain = present(points.map((p) => p.precipitationM))
  const maxKn = (values: number[]) => {
    const max = extreme(values, Math.max)
    return max === null ? null : msToKnots(max)
  }
  const minPressure = extreme(pressure, Math.min)
  const maxPressure = extreme(pressure, Math.max)
  return {
    maxWindKn: maxKn(wind),
    maxGustKn: maxKn(gust),
    maxWaveM: extreme(wave, Math.max),
    minPressureHpa: minPressure === null ? null : paToHectopascal(minPressure),
    maxPressureHpa: maxPressure === null ? null : paToHectopascal(maxPressure),
    totalRainMm: rain.length > 0 ? rain.reduce((sum, value) => sum + value, 0) * 1000 : null,
  }
}

const cacheKey = (boatId: number) => `fleetai:signalk-forecast:${boatId}`

export function readForecastCache(
  storage: WeatherStorage | null,
  boatId: number
): WeatherForecastSnapshot | null {
  try {
    const raw = storage?.getItem(cacheKey(boatId))
    if (!raw) return null
    const data = obj(JSON.parse(raw))
    const points = (Array.isArray(data.points) ? data.points : []).flatMap(
      (entry: unknown): WeatherForecastPoint[] => {
        const p = obj(entry)
        if (typeof p.at !== 'string') return []
        return [
          {
            at: p.at,
            windSpeedMs: num(p.windSpeedMs),
            windGustMs: num(p.windGustMs),
            windDirectionRad: num(p.windDirectionRad),
            waveHeightM: num(p.waveHeightM),
            wavePeriodS: num(p.wavePeriodS),
            pressurePa: num(p.pressurePa),
            precipitationM: num(p.precipitationM),
            temperatureK: num(p.temperatureK),
          },
        ]
      }
    )
    const fetchedAt = num(data.fetchedAt)
    const latitude = num(data.latitude)
    const longitude = num(data.longitude)
    if (fetchedAt === null || latitude === null || longitude === null || points.length === 0) {
      return null
    }
    return {
      fetchedAt,
      providerId: typeof data.providerId === 'string' ? data.providerId : '',
      providerName: typeof data.providerName === 'string' ? data.providerName : '',
      latitude,
      longitude,
      points,
    }
  } catch {
    return null
  }
}

export function writeForecastCache(
  storage: WeatherStorage | null,
  boatId: number,
  snapshot: WeatherForecastSnapshot
): void {
  try {
    storage?.setItem(cacheKey(boatId), JSON.stringify(snapshot))
  } catch {
    // quota plein ou stockage bloqué : l'affichage marche sans cache
  }
}

/** `navigation.position` ({ latitude, longitude }) → coordonnées valides, sinon `null`. */
export function parsePosition(value: unknown): { latitude: number; longitude: number } | null {
  const raw = obj(value)
  const latitude = num(raw.latitude)
  const longitude = num(raw.longitude)
  if (latitude === null || longitude === null) return null
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null
  return { latitude, longitude }
}
