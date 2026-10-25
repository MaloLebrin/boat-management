import {
  AIS_MAX_TARGETS,
  AIS_MMSI_PATTERN,
  AIS_NAME_MAX_LENGTH,
  AIS_PATH_PREFIX,
  AIS_RISK_CPA_M,
  AIS_RISK_TCPA_S,
  AIS_TARGET_EXPIRY_MS,
} from '#shared/constants/ais'
import { haversineDistanceMeters } from '#shared/helpers/geo'
import type { AisRisk, AisTarget, AisTargetValue } from '#shared/types/ais'

/** `ais.<mmsi>` : le chemin synthétique d'une cible dans un lot. */
export function aisPath(mmsi: string): string {
  return `${AIS_PATH_PREFIX}${mmsi}`
}

/** Le MMSI d'un chemin `ais.<mmsi>`, ou `null` si ce n'en est pas un. */
export function parseAisPath(path: string): string | null {
  if (!path.startsWith(AIS_PATH_PREFIX)) return null
  const mmsi = path.slice(AIS_PATH_PREFIX.length)
  return AIS_MMSI_PATTERN.test(mmsi) ? mmsi : null
}

/** Vrai pour tout chemin de la famille `ais.*`, valide ou non (le serveur le refuse alors). */
export function isAisPathFamily(path: string): boolean {
  return path.startsWith(AIS_PATH_PREFIX)
}

/** Le MMSI d'un contexte Signal K (`vessels.urn:mrn:imo:mmsi:244630000`), ou `null`. */
export function mmsiFromContext(context: string | undefined): string | null {
  if (!context) return null
  const match = /^vessels\.urn:mrn:imo:mmsi:(\d{9})$/.exec(context)
  return match ? match[1] : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * Valide la valeur d'une cible (serveur) ou la reconstruit depuis un état
 * partiel (client). `null` si la position manque ou est hors bornes : une
 * cible sans position ne sert ni la liste, ni la carte.
 */
export function parseAisTargetValue(raw: unknown): AisTargetValue | null {
  if (!isRecord(raw)) return null
  const latitude = finiteOrNull(raw.latitude)
  const longitude = finiteOrNull(raw.longitude)
  if (latitude === null || longitude === null) return null
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null

  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, AIS_NAME_MAX_LENGTH) : ''
  const shipType = finiteOrNull(raw.shipType)
  const shipTypeName =
    typeof raw.shipTypeName === 'string' ? raw.shipTypeName.trim().slice(0, 60) : ''
  return {
    name: name === '' ? null : name,
    latitude,
    longitude,
    sogMs: finiteOrNull(raw.sogMs),
    cogRad: finiteOrNull(raw.cogRad),
    shipType: shipType !== null && Number.isInteger(shipType) ? shipType : null,
    shipTypeName: shipTypeName === '' ? null : shipTypeName,
    cpaM: finiteOrNull(raw.cpaM),
    tcpaS: finiteOrNull(raw.tcpaS),
  }
}

/** Distance du bateau à chaque cible ; `null` quand sa position est inconnue. */
export function withDistances(
  targets: AisTarget[],
  own: { latitude: number; longitude: number } | null
): AisTarget[] {
  return targets.map((target) => ({
    ...target,
    distanceM: own === null ? null : haversineDistanceMeters(own, target),
  }))
}

/** Les plus proches d'abord ; sans distance, les plus récemment vues. */
export function sortAisTargets(targets: AisTarget[]): AisTarget[] {
  return [...targets].sort((a, b) => {
    if (a.distanceM !== null && b.distanceM !== null) return a.distanceM - b.distanceM
    if (a.distanceM !== null) return -1
    if (b.distanceM !== null) return 1
    return Date.parse(b.seenAt) - Date.parse(a.seenAt)
  })
}

/** Garde les `max` plus proches. */
export function nearestAisTargets(
  targets: AisTarget[],
  max: number = AIS_MAX_TARGETS
): AisTarget[] {
  return sortAisTargets(targets).slice(0, max)
}

/** Retire les cibles muettes depuis `AIS_TARGET_EXPIRY_MS`. */
export function dropExpiredTargets(targets: AisTarget[], nowMs: number): AisTarget[] {
  return targets.filter((target) => nowMs - Date.parse(target.seenAt) <= AIS_TARGET_EXPIRY_MS)
}

/**
 * Risque d'abordage lu dans `closestApproach` : `danger` quand le point de
 * plus courte approche est proche **et** à venir, `watch` quand une seule des
 * deux conditions tient. Un TCPA négatif (les navires s'éloignent) n'est pas un risque.
 */
export function aisRisk(target: Pick<AisTarget, 'cpaM' | 'tcpaS'>): AisRisk {
  if (target.cpaM === null || target.tcpaS === null || target.tcpaS < 0) return 'none'
  const close = target.cpaM <= AIS_RISK_CPA_M
  const soon = target.tcpaS <= AIS_RISK_TCPA_S
  if (close && soon) return 'danger'
  return close || soon ? 'watch' : 'none'
}
