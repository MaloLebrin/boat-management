/**
 * Prévisions météo du serveur Signal K du bord (#1010, épopée #986).
 * Lues directement par la PWA via l'API Weather v2 — jamais stockées en base.
 * Valeurs en unités SI telles que servies par Signal K.
 */

/** Un créneau de prévision. `null` = le fournisseur ne l'expose pas. */
export interface WeatherForecastPoint {
  /** Début du créneau, ISO 8601. */
  at: string
  windSpeedMs: number | null
  windGustMs: number | null
  /** Direction d'où vient le vent, radians. */
  windDirectionRad: number | null
  waveHeightM: number | null
  wavePeriodS: number | null
  pressurePa: number | null
  /** Cumul sur le créneau, mètres (Signal K : `precipitationVolume`). */
  precipitationM: number | null
  temperatureK: number | null
}

/** Dernière réponse récupérée — c'est aussi ce qui est gardé en cache local. */
export interface WeatherForecastSnapshot {
  /** Horloge du client au moment de la récupération (ms). */
  fetchedAt: number
  providerId: string
  providerName: string
  latitude: number
  longitude: number
  points: WeatherForecastPoint[]
}

export interface WeatherProviderInfo {
  id: string
  name: string
  isDefault: boolean
}

/** Pourquoi les prévisions ne se chargent pas — porté par l'UI. */
export type WeatherErrorKey =
  | 'no_position'
  | 'unsupported'
  | 'no_provider'
  | 'unauthorized'
  | 'unreachable'
  | 'invalid'

export type WeatherRangeHours = 24 | 48 | 72

/** Une mesure tracée : clé i18n (`instruments.forecast.metric.<key>`), unité, séries. */
export type WeatherMetricKey = 'wind' | 'gust' | 'wave' | 'pressure' | 'rain' | 'temperature'

export interface WeatherMetricSeries {
  key: WeatherMetricKey
  unit: string
  digits: number
  /** `[ISO, valeur en unité d'affichage]`. */
  points: Array<[string, number]>
}

export interface WeatherSummary {
  maxWindKn: number | null
  maxGustKn: number | null
  maxWaveM: number | null
  minPressureHpa: number | null
  maxPressureHpa: number | null
  totalRainMm: number | null
}
