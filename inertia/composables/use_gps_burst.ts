import { ref } from 'vue'
import { summarizeGpsBurst } from '#shared/helpers/geo'
import type { GpsBurstSummary, GpsSample } from '#shared/types/navigation_log'

export type GpsBurstState = 'idle' | 'acquiring' | 'done' | 'error'
export type GpsBurstErrorKey = 'unsupported' | 'denied' | 'unavailable'

export interface CaptureOptions {
  /** Durée de la rafale (3-5 s recommandé par le cahier des charges). */
  durationMs?: number
  /** Fixes moins précis que ce seuil (m) ignorés. */
  maxAccuracyMeters?: number
  /** La rafale s'arrête dès ce nombre d'échantillons retenus. */
  maxSamples?: number
}

/**
 * Rafale GPS au tap : `watchPosition` est démarré puis arrêté dans la même
 * interaction utilisateur — jamais en arrière-plan, donc compatible iOS PWA
 * (le JS s'arrête dès que l'app quitte le premier plan). La rafale de 3-5 s
 * permet un COG/SOG représentatifs de la trajectoire : un fix isolé donnerait
 * un cap faux juste après un virement de bord.
 */
export function useGpsBurst() {
  const state = ref<GpsBurstState>('idle')
  const errorKey = ref<GpsBurstErrorKey | null>(null)
  const result = ref<GpsBurstSummary | null>(null)

  function capture(options: CaptureOptions = {}): Promise<GpsBurstSummary | null> {
    const durationMs = options.durationMs ?? 4000
    const maxAccuracyMeters = options.maxAccuracyMeters ?? 50
    const maxSamples = options.maxSamples ?? 6

    errorKey.value = null
    result.value = null

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      state.value = 'error'
      errorKey.value = 'unsupported'
      return Promise.resolve(null)
    }

    state.value = 'acquiring'
    const samples: GpsSample[] = []

    return new Promise((resolve) => {
      let watchId: number | null = null
      let timer: ReturnType<typeof setTimeout> | null = null
      let settled = false

      const finish = () => {
        if (settled) return
        settled = true
        if (watchId !== null) navigator.geolocation.clearWatch(watchId)
        if (timer !== null) clearTimeout(timer)

        const summary = summarizeGpsBurst(samples)
        if (summary === null) {
          state.value = 'error'
          errorKey.value = errorKey.value ?? 'unavailable'
          resolve(null)
          return
        }
        result.value = summary
        state.value = 'done'
        resolve(summary)
      }

      // Démarré de façon synchrone dans le handler du tap : l'invite de
      // permission iOS/Safari exige un geste utilisateur.
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (position.coords.accuracy > maxAccuracyMeters) return
          samples.push({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          })
          if (samples.length >= maxSamples) finish()
        },
        (error) => {
          errorKey.value = error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'
          finish()
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
      )

      timer = setTimeout(finish, durationMs)
    })
  }

  function reset() {
    state.value = 'idle'
    errorKey.value = null
    result.value = null
  }

  return { state, errorKey, result, capture, reset }
}
