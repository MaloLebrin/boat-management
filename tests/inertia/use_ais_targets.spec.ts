import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { useAisTargets } from '../../inertia/composables/use_ais_targets'
import { ruleForPath } from '../../inertia/lib/signalk/path_catalog'
import { createAggregator } from '../../inertia/lib/signalk/aggregator'
import type { NormalizedSample, SignalKDelta } from '../../inertia/lib/signalk/types'

const OWN = { latitude: 43, longitude: 5 }

function target(mmsi: string, extra: Array<{ path: string; value: unknown }> = []): SignalKDelta {
  return {
    context: `vessels.urn:mrn:imo:mmsi:${mmsi}`,
    updates: [
      {
        values: [
          { path: 'navigation.position', value: { latitude: 43.01, longitude: 5 } },
          { path: 'name', value: 'ALBATROS' },
          ...extra,
        ],
      },
    ],
  }
}

describe('useAisTargets (#1009)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-25T10:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  test('les deltas ne mettent l’écran à jour qu’au cycle de rafraîchissement', () => {
    const ais = useAisTargets({ own: () => OWN })
    ais.start()
    ais.handleDelta(target('244630000'))
    expect(ais.targets.value).toEqual([])

    vi.advanceTimersByTime(5000)
    expect(ais.targets.value).toHaveLength(1)
    expect(ais.targets.value[0]).toMatchObject({ mmsi: '244630000', name: 'ALBATROS' })
    ais.stop()
  })

  test('une cible vue envoie un échantillon ais.<mmsi>, une cible muette n’est pas renvoyée', () => {
    const batches: NormalizedSample[][] = []
    const ais = useAisTargets({ own: () => OWN, onSamples: (samples) => batches.push(samples) })
    ais.start()
    ais.handleDelta(target('244630000', [{ path: 'navigation.speedOverGround', value: 2 }]))

    vi.advanceTimersByTime(5000)
    expect(batches).toHaveLength(1)
    expect(batches[0][0]).toMatchObject({
      path: 'ais.244630000',
      value: null,
      valueJson: { name: 'ALBATROS', latitude: 43.01, longitude: 5, sogMs: 2 },
    })

    // Aucun nouveau message : rien à renvoyer au cycle suivant.
    vi.advanceTimersByTime(5000)
    expect(batches).toHaveLength(1)

    vi.advanceTimersByTime(1000)
    ais.handleDelta(target('244630000'))
    vi.advanceTimersByTime(5000)
    expect(batches).toHaveLength(2)
    ais.stop()
  })

  test('stop vide les cibles et arrête le cycle', () => {
    const onSamples = vi.fn()
    const ais = useAisTargets({ own: () => OWN, onSamples })
    ais.start()
    ais.handleDelta(target('244630000'))
    vi.advanceTimersByTime(5000)
    ais.stop()
    expect(ais.targets.value).toEqual([])
    ais.handleDelta(target('244630001'))
    vi.advanceTimersByTime(20_000)
    expect(onSamples).toHaveBeenCalledTimes(1)
    expect(ais.targets.value).toEqual([])
  })

  test('start deux fois ne double pas le cycle', () => {
    const onSamples = vi.fn()
    const ais = useAisTargets({ own: () => OWN, onSamples })
    ais.start()
    ais.start()
    ais.handleDelta(target('244630000'))
    vi.advanceTimersByTime(5000)
    expect(onSamples).toHaveBeenCalledTimes(1)
    ais.stop()
  })
})

describe('échantillons AIS et agrégateur (#1009)', () => {
  test('une cible suit la fenêtre de 5 minutes, dernier état gagnant', () => {
    expect(ruleForPath('ais.244630000')).toEqual({ intervalS: 300, aggregate: 'last' })

    const aggregator = createAggregator()
    const start = Date.parse('2026-10-25T10:00:00Z')
    aggregator.push(
      'ais.244630000',
      { value: null, valueJson: { latitude: 1, longitude: 2 } },
      start
    )
    aggregator.push(
      'ais.244630000',
      { value: null, valueJson: { latitude: 3, longitude: 4 } },
      start + 60_000
    )
    const out = aggregator.flush(start + 300_000)
    expect(out).toEqual([
      {
        path: 'ais.244630000',
        recordedAt: '2026-10-25T10:00:00.000Z',
        valueJson: { latitude: 3, longitude: 4 },
      },
    ])
  })
})
