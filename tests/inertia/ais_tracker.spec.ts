import { describe, expect, test } from 'vitest'
import { createAisTracker } from '../../inertia/lib/signalk/ais_tracker'
import type { SignalKDelta } from '../../inertia/lib/signalk/types'
import { AIS_MAX_TARGETS, AIS_TARGET_EXPIRY_MS } from '../../shared/constants/ais'

const OWN = { latitude: 43.0, longitude: 5.0 }

function delta(
  mmsi: string,
  values: Array<{ path: string; value: unknown }>,
  context = `vessels.urn:mrn:imo:mmsi:${mmsi}`
): SignalKDelta {
  return { context, updates: [{ timestamp: '2026-10-25T10:00:00Z', values }] }
}

function position(latitude: number, longitude: number) {
  return { path: 'navigation.position', value: { latitude, longitude } }
}

describe('createAisTracker (#1009)', () => {
  test('ignore les contextes qui ne sont pas un MMSI (self, autres)', () => {
    const tracker = createAisTracker()
    expect(tracker.ingest(delta('x', [position(43, 5)], 'vessels.self'), 0)).toBe(false)
    expect(
      tracker.ingest(delta('x', [position(43, 5)], 'vessels.urn:mrn:signalk:uuid:abc'), 0)
    ).toBe(false)
    expect(tracker.snapshot(0, OWN)).toEqual([])
  })

  test('assemble une cible depuis plusieurs deltas', () => {
    const tracker = createAisTracker()
    tracker.ingest(delta('244630000', [position(43.01, 5.0)]), 1000)
    tracker.ingest(
      delta('244630000', [
        { path: 'navigation.speedOverGround', value: 3.2 },
        { path: 'navigation.courseOverGroundTrue', value: 1.5 },
        { path: 'name', value: 'ALBATROS' },
        { path: 'design.aisShipType', value: { id: 36, name: 'Sailing' } },
        { path: 'navigation.closestApproach', value: { distance: 400, timeTo: 600 } },
      ]),
      2000
    )

    const [target] = tracker.snapshot(3000, OWN)
    expect(target).toMatchObject({
      mmsi: '244630000',
      name: 'ALBATROS',
      latitude: 43.01,
      longitude: 5.0,
      sogMs: 3.2,
      cogRad: 1.5,
      shipType: 36,
      shipTypeName: 'Sailing',
      cpaM: 400,
      tcpaS: 600,
    })
    expect(target.seenAt).toBe(new Date(2000).toISOString())
    expect(target.distanceM).toBeGreaterThan(1000)
  })

  test('un nom publié à la racine est repris, un null ne remplace rien', () => {
    const tracker = createAisTracker()
    tracker.ingest(
      delta('244630000', [position(43, 5), { path: '', value: { name: 'RACINE' } }]),
      0
    )
    tracker.ingest(
      delta('244630000', [
        { path: 'name', value: null },
        { path: 'navigation.speedOverGround', value: null },
      ]),
      10
    )
    expect(tracker.snapshot(20, OWN)[0].name).toBe('RACINE')
  })

  test('une cible sans position n’apparaît pas', () => {
    const tracker = createAisTracker()
    tracker.ingest(delta('244630000', [{ path: 'name', value: 'SANS FIX' }]), 0)
    expect(tracker.snapshot(1, OWN)).toEqual([])
  })

  test('valeurs invalides écartées (position hors bornes, vitesse non finie)', () => {
    const tracker = createAisTracker()
    tracker.ingest(
      delta('244630000', [
        position(95, 5),
        { path: 'navigation.speedOverGround', value: Number.NaN },
      ]),
      0
    )
    expect(tracker.snapshot(1, OWN)).toEqual([])
  })

  test('closestApproach ultérieur sans valeur efface le CPA devenu faux', () => {
    const tracker = createAisTracker()
    tracker.ingest(
      delta('244630000', [
        position(43, 5),
        { path: 'navigation.closestApproach', value: { distance: 300, timeTo: 120 } },
      ]),
      0
    )
    tracker.ingest(
      delta('244630000', [{ path: 'navigation.closestApproach', value: { distance: null } }]),
      5
    )
    expect(tracker.snapshot(6, OWN)[0]).toMatchObject({ cpaM: null, tcpaS: null })
  })

  test('trie par distance et garde les plus proches', () => {
    const tracker = createAisTracker()
    for (let index = 0; index < AIS_MAX_TARGETS + 5; index += 1) {
      const mmsi = String(200000000 + index)
      tracker.ingest(delta(mmsi, [position(43 + index * 0.01, 5)]), 0)
    }
    const snapshot = tracker.snapshot(1, OWN)
    expect(snapshot).toHaveLength(AIS_MAX_TARGETS)
    expect(snapshot[0].mmsi).toBe('200000000')
    const distances = snapshot.map((target) => target.distanceM as number)
    expect(distances).toEqual([...distances].sort((a, b) => a - b))
  })

  test('sans position du bateau : pas de distance, les plus récentes d’abord', () => {
    const tracker = createAisTracker()
    tracker.ingest(delta('200000001', [position(43, 5)]), 1000)
    tracker.ingest(delta('200000002', [position(43, 5)]), 2000)
    const snapshot = tracker.snapshot(3000, null)
    expect(snapshot.map((target) => target.mmsi)).toEqual(['200000002', '200000001'])
    expect(snapshot[0].distanceM).toBeNull()
  })

  test('une cible muette depuis plus de dix minutes disparaît et est oubliée', () => {
    const tracker = createAisTracker()
    tracker.ingest(delta('200000001', [position(43, 5)]), 0)
    expect(tracker.snapshot(AIS_TARGET_EXPIRY_MS, OWN)).toHaveLength(1)
    expect(tracker.snapshot(AIS_TARGET_EXPIRY_MS + 1, OWN)).toEqual([])
    // Réapparue : repart de zéro, l'ancienne position n'est pas ressuscitée.
    tracker.ingest(
      delta('200000001', [{ path: 'name', value: 'REVENU' }]),
      AIS_TARGET_EXPIRY_MS + 5
    )
    expect(tracker.snapshot(AIS_TARGET_EXPIRY_MS + 6, OWN)).toEqual([])
  })

  test('borne la mémoire : les cibles les plus anciennes sont oubliées au-delà de 500', () => {
    const tracker = createAisTracker()
    for (let index = 0; index < 505; index += 1) {
      tracker.ingest(delta(String(300000000 + index), [position(43, 5)]), index)
    }
    const mmsis = new Set(tracker.snapshot(600, null).map((target) => target.mmsi))
    expect(mmsis.has('300000000')).toBe(false)
    expect(mmsis.has('300000504')).toBe(true)
  })

  test('clear oublie tout', () => {
    const tracker = createAisTracker()
    tracker.ingest(delta('200000001', [position(43, 5)]), 0)
    tracker.clear()
    expect(tracker.snapshot(1, OWN)).toEqual([])
  })
})
