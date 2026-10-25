import { getCurrentInstance, onBeforeUnmount, ref } from 'vue'
import { createAisTracker } from '~/lib/signalk/ais_tracker'
import type { NormalizedSample, SignalKDelta } from '~/lib/signalk/types'
import { AIS_DISPLAY_REFRESH_MS } from '#shared/constants/ais'
import { aisPath } from '#shared/helpers/ais'
import type { AisTarget } from '#shared/types/ais'

export interface AisTargetsOptions {
  /** Position du bateau, pour la distance et le tri ; `null` tant qu'elle est inconnue. */
  own: () => { latitude: number; longitude: number } | null
  /** Reçoit un échantillon `ais.<mmsi>` par cible nouvellement vue — branché sur `useTelemetrySync().push`. */
  onSamples?: (samples: NormalizedSample[]) => void
  refreshMs?: number
}

/**
 * Cibles AIS du flux Signal K (#1009). Les deltas alimentent un suivi par MMSI ;
 * l'écran et l'enregistrement ne le lisent que toutes les `refreshMs`
 * (sous-échantillonnage : une mise à jour par cible et par cycle, quel que
 * soit le débit du serveur). Le serveur ne reçoit qu'un état par cible et par
 * fenêtre — l'agrégateur garde le dernier —, par le même chemin que les
 * mesures, donc avec la même file hors ligne.
 */
export function useAisTargets(options: AisTargetsOptions) {
  const tracker = createAisTracker()
  const targets = ref<AisTarget[]>([])
  /** MMSI → dernier `seenAt` déjà transmis : une cible muette n'est pas réenregistrée. */
  const sent = new Map<string, string>()
  let timer: ReturnType<typeof setInterval> | null = null

  function handleDelta(delta: SignalKDelta) {
    tracker.ingest(delta, Date.now())
  }

  function toSample(target: AisTarget): NormalizedSample {
    return {
      path: aisPath(target.mmsi),
      value: null,
      valueJson: {
        name: target.name,
        latitude: target.latitude,
        longitude: target.longitude,
        sogMs: target.sogMs,
        cogRad: target.cogRad,
        shipType: target.shipType,
        shipTypeName: target.shipTypeName,
        cpaM: target.cpaM,
        tcpaS: target.tcpaS,
      },
      signalkTimestamp: null,
    }
  }

  function refresh() {
    const snapshot = tracker.snapshot(Date.now(), options.own())
    targets.value = snapshot

    const fresh = snapshot.filter((target) => sent.get(target.mmsi) !== target.seenAt)
    for (const target of fresh) sent.set(target.mmsi, target.seenAt)
    for (const mmsi of sent.keys()) {
      if (!snapshot.some((target) => target.mmsi === mmsi)) sent.delete(mmsi)
    }
    if (fresh.length > 0) options.onSamples?.(fresh.map(toSample))
  }

  function start() {
    if (typeof window === 'undefined' || timer !== null) return
    timer = setInterval(refresh, options.refreshMs ?? AIS_DISPLAY_REFRESH_MS)
  }

  function stop() {
    if (timer !== null) clearInterval(timer)
    timer = null
    tracker.clear()
    sent.clear()
    targets.value = []
  }

  if (getCurrentInstance()) onBeforeUnmount(stop)

  return { targets, handleDelta, refresh, start, stop }
}
