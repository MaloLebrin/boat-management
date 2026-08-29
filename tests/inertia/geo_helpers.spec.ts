import { describe, expect, test } from 'vitest'
import {
  haversineDistanceMeters,
  initialBearingDeg,
  summarizeGpsBurst,
} from '../../shared/helpers/geo'
import type { GpsSample } from '../../shared/types/navigation_log'

function sample(latitude: number, longitude: number, timestamp: number, accuracy = 5): GpsSample {
  return { latitude, longitude, accuracy, timestamp }
}

describe('haversineDistanceMeters', () => {
  test('distance nulle entre deux points identiques', () => {
    expect(haversineDistanceMeters(sample(47.27, -2.21, 0), sample(47.27, -2.21, 0))).toBe(0)
  })

  test('1 minute de latitude ≈ 1 mille nautique (1852 m)', () => {
    const d = haversineDistanceMeters(sample(47, -2.21, 0), sample(47 + 1 / 60, -2.21, 0))
    expect(d).toBeGreaterThan(1840)
    expect(d).toBeLessThan(1865)
  })
})

describe('initialBearingDeg', () => {
  test('plein nord = 0°', () => {
    expect(initialBearingDeg(sample(47, -2, 0), sample(48, -2, 0))).toBeCloseTo(0, 0)
  })

  test('plein est ≈ 90°', () => {
    expect(initialBearingDeg(sample(0, 0, 0), sample(0, 1, 0))).toBeCloseTo(90, 0)
  })

  test('plein sud = 180°', () => {
    expect(initialBearingDeg(sample(48, -2, 0), sample(47, -2, 0))).toBeCloseTo(180, 0)
  })

  test('plein ouest ≈ 270°', () => {
    expect(initialBearingDeg(sample(0, 0, 0), sample(0, -1, 0))).toBeCloseTo(270, 0)
  })

  test("traversée de l'antiméridien : cap est, pas ouest", () => {
    expect(initialBearingDeg(sample(0, 179.9, 0), sample(0, -179.9, 0))).toBeCloseTo(90, 0)
  })
})

describe('summarizeGpsBurst', () => {
  test('rafale vide → null', () => {
    expect(summarizeGpsBurst([])).toBeNull()
  })

  test('un seul fix → position sans COG ni SOG', () => {
    const summary = summarizeGpsBurst([sample(47.27, -2.21, 1000)])
    expect(summary).toEqual({
      latitude: 47.27,
      longitude: -2.21,
      gpsAccuracyM: 5,
      cogDeg: null,
      sogKn: null,
    })
  })

  test('sous le seuil de bruit (mouillage) → vitesse quasi nulle, cap null', () => {
    // ~2 m de dérive en 4 s
    const summary = summarizeGpsBurst([
      sample(47.27, -2.21, 0, 8),
      sample(47.270018, -2.21, 4000, 4),
    ])
    expect(summary).not.toBeNull()
    expect(summary!.sogKn).toBe(0)
    expect(summary!.cogDeg).toBeNull()
    // La position retenue est le fix le plus précis
    expect(summary!.gpsAccuracyM).toBe(4)
  })

  test('rafale en mouvement → SOG en nœuds et COG du premier vers le dernier fix', () => {
    // 1' de latitude vers le nord (~1852 m) en 4 s serait irréaliste ; on prend
    // ~10.3 m en 4 s ≈ 2.57 m/s ≈ 5 nd, cap nord.
    const summary = summarizeGpsBurst([sample(47.27, -2.21, 0), sample(47.2700926, -2.21, 4000)])
    expect(summary).not.toBeNull()
    expect(summary!.cogDeg).toBe(0)
    expect(summary!.sogKn).toBeGreaterThan(4.5)
    expect(summary!.sogKn).toBeLessThan(5.5)
    // Position retenue : dernier fix
    expect(summary!.latitude).toBeCloseTo(47.2700926, 6)
  })

  test('durée nulle ou négative → pas de SOG/COG', () => {
    const summary = summarizeGpsBurst([sample(47.27, -2.21, 5000), sample(47.28, -2.21, 5000)])
    expect(summary!.cogDeg).toBeNull()
    expect(summary!.sogKn).toBeNull()
  })
})
