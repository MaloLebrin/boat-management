import { describe, expect, test } from 'vitest'
import {
  OFFLINE_WINDOW_MS,
  chunkSamples,
  coarsen,
  createAggregator,
} from '../../inertia/lib/signalk/aggregator'
import type { TelemetrySampleInput } from '../../shared/types/instruments'

const T0 = Date.parse('2026-10-19T10:00:00.000Z')
const num = (value: number) => ({ value, valueJson: null })

describe('createAggregator (#989)', () => {
  test('une valeur par fenêtre : moyenne, datée au début de la fenêtre (D9)', () => {
    const aggregator = createAggregator()
    aggregator.push('propulsion.port.revolutions', num(40), T0 + 1_000)
    aggregator.push('propulsion.port.revolutions', num(50), T0 + 20_000)

    expect(aggregator.flush(T0 + 30_000)).toEqual([])
    expect(aggregator.flush(T0 + 60_000)).toEqual([
      { path: 'propulsion.port.revolutions', recordedAt: '2026-10-19T10:00:00.000Z', value: 45 },
    ])
    expect(aggregator.flush(T0 + 120_000)).toEqual([])
  })

  test('max et dernière valeur selon la règle du chemin', () => {
    const aggregator = createAggregator()
    aggregator.push('propulsion.port.temperature', num(350), T0)
    aggregator.push('propulsion.port.temperature', num(360), T0 + 10_000)
    aggregator.push('propulsion.port.temperature', num(355), T0 + 20_000)
    aggregator.push('propulsion.port.runTime', num(100), T0)
    aggregator.push('propulsion.port.runTime', num(160), T0 + 10_000)

    const out = aggregator.flush(T0 + 300_000)
    expect(out.find((s) => s.path === 'propulsion.port.temperature')?.value).toBe(360)
    expect(out.find((s) => s.path === 'propulsion.port.runTime')?.value).toBe(160)
  })

  test('une valeur qui arrive dans la fenêtre suivante clôt la précédente', () => {
    const aggregator = createAggregator()
    aggregator.push('propulsion.port.revolutions', num(40), T0)
    aggregator.push('propulsion.port.revolutions', num(60), T0 + 61_000)

    const out = aggregator.flush(T0 + 61_500)
    expect(out).toEqual([
      { path: 'propulsion.port.revolutions', recordedAt: '2026-10-19T10:00:00.000Z', value: 40 },
    ])
  })

  test('les valeurs structurées gardent la dernière, sous valueJson', () => {
    const aggregator = createAggregator()
    aggregator.push(
      'navigation.position',
      { value: null, valueJson: { latitude: 1, longitude: 2 } },
      T0
    )
    aggregator.push(
      'navigation.position',
      { value: null, valueJson: { latitude: 3, longitude: 4 } },
      T0 + 5_000
    )

    expect(aggregator.flush(T0 + 60_000)).toEqual([
      {
        path: 'navigation.position',
        recordedAt: '2026-10-19T10:00:00.000Z',
        valueJson: { latitude: 3, longitude: 4 },
      },
    ])
  })

  test('force vide aussi les fenêtres ouvertes', () => {
    const aggregator = createAggregator()
    aggregator.push('environment.depth.belowKeel', num(4), T0)
    expect(aggregator.flush(T0 + 1_000)).toEqual([])
    expect(aggregator.flush(T0 + 1_000, { force: true })).toHaveLength(1)
  })

  test('hors-ligne : fenêtres de 5 minutes au moins', () => {
    const aggregator = createAggregator()
    aggregator.setMode('offline')
    aggregator.push('environment.depth.belowKeel', num(4), T0)
    aggregator.push('environment.depth.belowKeel', num(6), T0 + 4 * 60_000)

    expect(aggregator.flush(T0 + 60_000)).toEqual([])
    const out = aggregator.flush(T0 + OFFLINE_WINDOW_MS)
    expect(out).toEqual([
      { path: 'environment.depth.belowKeel', recordedAt: '2026-10-19T10:00:00.000Z', value: 5 },
    ])
  })

  test('un instantané restitué reprend la fenêtre en cours', () => {
    const first = createAggregator()
    first.push('propulsion.port.revolutions', num(40), T0)
    const restored = createAggregator(JSON.parse(JSON.stringify(first.snapshot())))
    restored.push('propulsion.port.revolutions', num(50), T0 + 10_000)

    expect(restored.flush(T0 + 60_000)[0].value).toBe(45)
  })
})

describe('chunkSamples et coarsen (#989)', () => {
  const sample = (path: string, minute: number, value: number): TelemetrySampleInput => ({
    path,
    recordedAt: new Date(T0 + minute * 60_000).toISOString(),
    value,
  })

  test('chunkSamples respecte la taille maximale du serveur', () => {
    const samples = Array.from({ length: 1201 }, (_, i) => sample('a.b', i, i))
    const chunks = chunkSamples(samples)
    expect(chunks.map((c) => c.length)).toEqual([500, 500, 201])
  })

  test('coarsen ne touche rien sous le plafond', () => {
    const batches = [[sample('navigation.speedOverGround', 0, 1)]]
    expect(coarsen(batches, 3)).toBe(batches)
  })

  test('coarsen fond les plus anciens lots en demi-heures, sans perdre de couverture', () => {
    const batches = [
      [sample('navigation.speedOverGround', 0, 2), sample('navigation.speedOverGround', 10, 4)],
      [sample('navigation.speedOverGround', 40, 6)],
      [sample('navigation.speedOverGround', 100, 8)],
    ]

    const out = coarsen(batches, 2)

    expect(out).toHaveLength(2)
    expect(out[0]).toEqual([
      { path: 'navigation.speedOverGround', recordedAt: '2026-10-19T10:00:00.000Z', value: 3 },
      { path: 'navigation.speedOverGround', recordedAt: '2026-10-19T10:30:00.000Z', value: 6 },
    ])
    expect(out[1]).toBe(batches[2])
  })

  test('coarsen garde la dernière valeur structurée d’une demi-heure', () => {
    const position = (minute: number, latitude: number): TelemetrySampleInput => ({
      path: 'navigation.position',
      recordedAt: new Date(T0 + minute * 60_000).toISOString(),
      valueJson: { latitude, longitude: 0 },
    })
    const out = coarsen([[position(0, 1), position(5, 2)], [position(60, 3)]], 1)
    expect(out.flat().map((s) => s.valueJson)).toEqual([
      { latitude: 2, longitude: 0 },
      { latitude: 3, longitude: 0 },
    ])
  })
})
