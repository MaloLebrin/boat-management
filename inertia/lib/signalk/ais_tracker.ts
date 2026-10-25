import { AIS_MAX_TARGETS, AIS_TARGET_EXPIRY_MS } from '#shared/constants/ais'
import {
  mmsiFromContext,
  nearestAisTargets,
  parseAisTargetValue,
  withDistances,
} from '#shared/helpers/ais'
import type { AisTarget, AisTargetValue } from '#shared/types/ais'
import type { SignalKDelta } from './types'

/**
 * Suivi des cibles AIS (#1009). Les cibles sont d'autres contextes Signal K
 * (`vessels.urn:mrn:imo:mmsi:<mmsi>`), que `sample_normalizer.ts` écarte : ici
 * on garde, par MMSI, l'état le plus récent de chaque champ utile. Pur, sans
 * Vue : le composable `use_ais_targets` l'interroge toutes les cinq secondes
 * (sous-échantillonnage), pas à chaque delta.
 */

/** Au-delà, les cibles les plus anciennes sont oubliées (port très fréquenté). */
const MAX_TRACKED = 500

interface TrackedTarget {
  name: string | null
  latitude: number | null
  longitude: number | null
  sogMs: number | null
  cogRad: number | null
  shipType: number | null
  shipTypeName: string | null
  cpaM: number | null
  tcpaS: number | null
  seenAtMs: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function emptyTarget(nowMs: number): TrackedTarget {
  return {
    name: null,
    latitude: null,
    longitude: null,
    sogMs: null,
    cogRad: null,
    shipType: null,
    shipTypeName: null,
    cpaM: null,
    tcpaS: null,
    seenAtMs: nowMs,
  }
}

/** Applique une valeur de chemin à la cible ; un `null` Signal K ne remplace rien. */
function applyValue(target: TrackedTarget, path: string, value: unknown) {
  if (value === null || value === undefined) return
  switch (path) {
    case 'navigation.position':
      if (isRecord(value)) {
        const latitude = finite(value.latitude)
        const longitude = finite(value.longitude)
        if (latitude !== null && longitude !== null) {
          target.latitude = latitude
          target.longitude = longitude
        }
      }
      return
    case 'navigation.speedOverGround':
      target.sogMs = finite(value) ?? target.sogMs
      return
    case 'navigation.courseOverGroundTrue':
      target.cogRad = finite(value) ?? target.cogRad
      return
    case 'name':
      if (typeof value === 'string') target.name = value
      return
    case '':
      // Certains serveurs publient le nom à la racine du navire.
      if (isRecord(value) && typeof value.name === 'string') target.name = value.name
      return
    case 'design.aisShipType':
      if (isRecord(value)) {
        target.shipType = finite(value.id) ?? target.shipType
        if (typeof value.name === 'string') target.shipTypeName = value.name
      }
      return
    case 'navigation.closestApproach':
      if (isRecord(value)) {
        target.cpaM = finite(value.distance)
        target.tcpaS = finite(value.timeTo)
      }
      return
    default:
  }
}

export function createAisTracker() {
  const tracked = new Map<string, TrackedTarget>()

  /** Retient le delta d'une cible ; `false` si ce n'est pas un contexte AIS. */
  function ingest(delta: SignalKDelta, nowMs: number): boolean {
    const mmsi = mmsiFromContext(delta.context)
    if (mmsi === null) return false

    const target = tracked.get(mmsi) ?? emptyTarget(nowMs)
    for (const update of delta.updates ?? []) {
      for (const entry of update.values ?? []) applyValue(target, entry.path, entry.value)
    }
    target.seenAtMs = nowMs
    tracked.set(mmsi, target)

    if (tracked.size > MAX_TRACKED) {
      const oldest = [...tracked.entries()].sort((a, b) => a[1].seenAtMs - b[1].seenAtMs)[0]
      tracked.delete(oldest[0])
    }
    return true
  }

  /**
   * Les cibles à afficher : positionnées, vues il y a moins de dix minutes,
   * les `AIS_MAX_TARGETS` plus proches (ou les plus récentes sans position du bateau).
   */
  function snapshot(
    nowMs: number,
    own: { latitude: number; longitude: number } | null
  ): AisTarget[] {
    const alive: AisTarget[] = []
    for (const [mmsi, state] of tracked) {
      if (nowMs - state.seenAtMs > AIS_TARGET_EXPIRY_MS) {
        tracked.delete(mmsi)
        continue
      }
      const value: AisTargetValue | null = parseAisTargetValue(state)
      if (value === null) continue
      alive.push({
        mmsi,
        seenAt: new Date(state.seenAtMs).toISOString(),
        distanceM: null,
        ...value,
      })
    }
    return nearestAisTargets(withDistances(alive, own), AIS_MAX_TARGETS)
  }

  function clear() {
    tracked.clear()
  }

  return { ingest, snapshot, clear }
}

export type AisTracker = ReturnType<typeof createAisTracker>
