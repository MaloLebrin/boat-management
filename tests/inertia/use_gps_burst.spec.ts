import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { useGpsBurst } from '../../inertia/composables/use_gps_burst'

type SuccessCb = (position: {
  coords: { latitude: number; longitude: number; accuracy: number }
  timestamp: number
}) => void
type ErrorCb = (error: { code: number; PERMISSION_DENIED: number }) => void

let successCb: SuccessCb | null = null
let errorCb: ErrorCb | null = null
const clearWatch = vi.fn()

function installGeolocationMock() {
  vi.stubGlobal('navigator', {
    geolocation: {
      watchPosition: vi.fn((onSuccess: SuccessCb, onError: ErrorCb) => {
        successCb = onSuccess
        errorCb = onError
        return 42
      }),
      clearWatch,
    },
  })
}

function emitFix(latitude: number, longitude: number, timestamp: number, accuracy = 5) {
  successCb?.({ coords: { latitude, longitude, accuracy }, timestamp })
}

describe('useGpsBurst', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    installGeolocationMock()
    successCb = null
    errorCb = null
    clearWatch.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  test('rafale nominale : COG/SOG calculés à la fin de la fenêtre', async () => {
    const { state, capture } = useGpsBurst()

    const promise = capture({ durationMs: 4000 })
    expect(state.value).toBe('acquiring')

    emitFix(47.27, -2.21, 0)
    emitFix(47.2700926, -2.21, 4000)
    vi.advanceTimersByTime(4000)

    const summary = await promise
    expect(summary).not.toBeNull()
    expect(summary!.cogDeg).toBe(0)
    expect(summary!.sogKn).toBeGreaterThan(4)
    expect(state.value).toBe('done')
    expect(clearWatch).toHaveBeenCalledWith(42)
  })

  test('permission refusée sans aucun fix → null et errorKey denied', async () => {
    const { state, errorKey, capture } = useGpsBurst()

    const promise = capture()
    errorCb?.({ code: 1, PERMISSION_DENIED: 1 })

    const summary = await promise
    expect(summary).toBeNull()
    expect(state.value).toBe('error')
    expect(errorKey.value).toBe('denied')
  })

  test('un seul fix → position conservée, COG/SOG null', async () => {
    const { state, capture } = useGpsBurst()

    const promise = capture({ durationMs: 4000 })
    emitFix(47.27, -2.21, 1000)
    vi.advanceTimersByTime(4000)

    const summary = await promise
    expect(summary).toEqual({
      latitude: 47.27,
      longitude: -2.21,
      gpsAccuracyM: 5,
      cogDeg: null,
      sogKn: null,
    })
    expect(state.value).toBe('done')
  })

  test('timeout sans fix → null et errorKey unavailable', async () => {
    const { state, errorKey, capture } = useGpsBurst()

    const promise = capture({ durationMs: 4000 })
    vi.advanceTimersByTime(4000)

    const summary = await promise
    expect(summary).toBeNull()
    expect(state.value).toBe('error')
    expect(errorKey.value).toBe('unavailable')
  })

  test('les fixes trop imprécis sont ignorés', async () => {
    const { capture } = useGpsBurst()

    const promise = capture({ durationMs: 4000, maxAccuracyMeters: 50 })
    emitFix(48.0, -3.0, 0, 120)
    emitFix(47.27, -2.21, 1000, 10)
    vi.advanceTimersByTime(4000)

    const summary = await promise
    expect(summary!.latitude).toBe(47.27)
  })

  test('géolocalisation non supportée → null immédiat', async () => {
    vi.stubGlobal('navigator', {})
    const { state, errorKey, capture } = useGpsBurst()

    const summary = await capture()
    expect(summary).toBeNull()
    expect(state.value).toBe('error')
    expect(errorKey.value).toBe('unsupported')
  })
})
