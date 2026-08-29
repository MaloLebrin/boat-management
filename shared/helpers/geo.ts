import type { GpsBurstSummary, GpsSample } from '#shared/types/navigation_log'

const EARTH_RADIUS_M = 6_371_000
const MS_TO_KNOTS = 1.943_84

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Distance orthodromique entre deux points, en mètres (formule de haversine). */
export function haversineDistanceMeters(
  a: Pick<GpsSample, 'latitude' | 'longitude'>,
  b: Pick<GpsSample, 'latitude' | 'longitude'>
): number {
  const dLat = toRadians(b.latitude - a.latitude)
  const dLon = toRadians(b.longitude - a.longitude)
  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

/** Cap initial (relèvement vrai) du point a vers le point b, en degrés [0, 360). */
export function initialBearingDeg(
  a: Pick<GpsSample, 'latitude' | 'longitude'>,
  b: Pick<GpsSample, 'latitude' | 'longitude'>
): number {
  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)
  const dLon = toRadians(b.longitude - a.longitude)

  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  const bearing = (Math.atan2(y, x) * 180) / Math.PI
  return (bearing + 360) % 360
}

export interface SummarizeGpsBurstOptions {
  /**
   * Distance minimale (m) entre le premier et le dernier fix pour que le cap
   * soit significatif. En dessous (au mouillage, dérive GPS), un COG serait du
   * bruit : on renvoie « vitesse quasi nulle » (sog 0, cog null).
   */
  minDistanceMeters?: number
}

/**
 * Agrège une rafale de fixes GPS (3-5 s au tap, cf. cahier des charges) en un
 * point de log : position retenue + COG/SOG représentatifs de la trajectoire.
 * Un point isolé donnerait un cap faux après un virement de bord — d'où la
 * rafale premier → dernier fix.
 */
export function summarizeGpsBurst(
  samples: GpsSample[],
  options: SummarizeGpsBurstOptions = {}
): GpsBurstSummary | null {
  if (samples.length === 0) return null

  const minDistanceMeters = options.minDistanceMeters ?? 8
  const first = samples[0]
  const last = samples[samples.length - 1]
  const best = samples.reduce((acc, s) => (s.accuracy < acc.accuracy ? s : acc))

  if (samples.length === 1) {
    return {
      latitude: first.latitude,
      longitude: first.longitude,
      gpsAccuracyM: first.accuracy,
      cogDeg: null,
      sogKn: null,
    }
  }

  const distanceMeters = haversineDistanceMeters(first, last)
  const durationMs = last.timestamp - first.timestamp

  // Trop peu de mouvement pendant la rafale : cap non significatif. On garde
  // le fix le plus précis comme position.
  if (distanceMeters < minDistanceMeters || durationMs <= 0) {
    return {
      latitude: best.latitude,
      longitude: best.longitude,
      gpsAccuracyM: best.accuracy,
      cogDeg: null,
      sogKn: durationMs > 0 ? 0 : null,
    }
  }

  const speedMs = distanceMeters / (durationMs / 1000)

  return {
    latitude: last.latitude,
    longitude: last.longitude,
    gpsAccuracyM: last.accuracy,
    cogDeg: Math.round(initialBearingDeg(first, last)) % 360,
    sogKn: Math.round(speedMs * MS_TO_KNOTS * 100) / 100,
  }
}
