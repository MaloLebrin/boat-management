import { describe, expect, test } from 'vitest'
import { normalizeDelta } from '../../inertia/lib/signalk/sample_normalizer'
import { ruleForPath, subscriptionSpecs } from '../../inertia/lib/signalk/path_catalog'
import { INSTRUMENT_PATH_CATALOG } from '../../shared/constants/instruments'

const delta = (values: Array<{ path: string; value: unknown }>, context = 'vessels.self') => ({
  context,
  updates: [{ timestamp: '2026-10-19T08:41:00.000Z', values }],
})

describe('normalizeDelta (#989)', () => {
  test('garde les valeurs numériques du catalogue avec le timestamp Signal K', () => {
    const [sample] = normalizeDelta(delta([{ path: 'navigation.speedOverGround', value: 3.2 }]), {
      context: 'vessels.self',
    })
    expect(sample).toEqual({
      path: 'navigation.speedOverGround',
      value: 3.2,
      valueJson: null,
      signalkTimestamp: '2026-10-19T08:41:00.000Z',
    })
  })

  test('écarte null, non-fini, chemin inconnu et mauvais genre', () => {
    const samples = normalizeDelta(
      delta([
        { path: 'navigation.headingTrue', value: null },
        { path: 'navigation.speedOverGround', value: Number.NaN },
        { path: 'navigation.speedThroughWater', value: 'vite' },
        { path: 'design.length', value: 12 },
        { path: 'navigation.position', value: 12 },
        { path: 'environment.depth.belowKeel', value: 4.1 },
      ])
    )
    expect(samples.map((s) => s.path)).toEqual(['environment.depth.belowKeel'])
  })

  test('position : latitude et longitude finies et bornées, rien d’autre', () => {
    const ok = normalizeDelta(
      delta([
        { path: 'navigation.position', value: { latitude: 43.2, longitude: 5.3, altitude: 4 } },
      ])
    )
    expect(ok[0].valueJson).toEqual({ latitude: 43.2, longitude: 5.3 })

    const bad = normalizeDelta(
      delta([{ path: 'navigation.position', value: { latitude: 143.2, longitude: 5.3 } }])
    )
    expect(bad).toEqual([])
  })

  test('alarme réduite à { state, message, method }', () => {
    const [sample] = normalizeDelta(
      delta([
        {
          path: 'notifications.electrical.batteries.house.lowVoltage',
          value: { state: 'alarm', message: 'Batterie basse', method: ['visual', 3], id: 'x' },
        },
      ])
    )
    expect(sample.valueJson).toEqual({
      state: 'alarm',
      message: 'Batterie basse',
      method: ['visual'],
    })
  })

  test('un autre navire est ignoré, le self annoncé par hello est accepté', () => {
    const values = [{ path: 'navigation.speedOverGround', value: 1 }]
    expect(
      normalizeDelta(delta(values, 'vessels.urn:mrn:imo:mmsi:2'), { context: 'vessels.self' })
    ).toEqual([])
    expect(
      normalizeDelta(delta(values, 'vessels.urn:mrn:imo:mmsi:1'), {
        context: 'vessels.self',
        selfContext: 'vessels.urn:mrn:imo:mmsi:1',
      })
    ).toHaveLength(1)
  })
})

describe('catalogue de cadences (#989)', () => {
  test('chaque motif du catalogue a un abonnement avec joker', () => {
    const specs = subscriptionSpecs()
    expect(specs).toHaveLength(INSTRUMENT_PATH_CATALOG.length)
    expect(specs.map((s) => s.path)).toContain('propulsion.*.revolutions')
    expect(specs.map((s) => s.path)).toContain('tanks.*.*.currentLevel')
    expect(specs.map((s) => s.path)).toContain('notifications.*')
  })

  test('les alarmes sont instantanées, les mesures lissées', () => {
    const specs = Object.fromEntries(subscriptionSpecs().map((s) => [s.path, s]))
    expect(specs['notifications.*'].policy).toBe('instant')
    expect(specs['propulsion.*.revolutions'].policy).toBe('fixed')
    expect(ruleForPath('propulsion.port.revolutions')).toEqual({ intervalS: 60, aggregate: 'mean' })
    expect(ruleForPath('notifications.x.y')).toEqual({ intervalS: 0, aggregate: 'last' })
    expect(ruleForPath('hors.catalogue')).toEqual({ intervalS: 60, aggregate: 'last' })
  })
})
