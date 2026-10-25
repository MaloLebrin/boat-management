import { describe, expect, test } from 'vitest'
import {
  hzToRpm,
  kelvinToCelsius,
  metersToNauticalMiles,
  msToKnots,
  normalizeDegrees,
  paToBar,
  radToDegrees,
  ratioToPercent,
  secondsToHours,
  toDisplayUnit,
} from '../../inertia/lib/signalk/units'

describe('unités Signal K (#989)', () => {
  test('vitesse : 1 nœud = 0,514444 m/s', () => {
    expect(msToKnots(0.514444)).toBeCloseTo(1, 4)
  })

  test('température, pression, ratio, durée', () => {
    expect(kelvinToCelsius(293.15)).toBeCloseTo(20)
    expect(paToBar(101_325)).toBeCloseTo(1.01325)
    expect(ratioToPercent(0.625)).toBe(62.5)
    expect(secondsToHours(7200)).toBe(2)
  })

  test('distance : 1852 m = 1 mille nautique, la puissance reste en watts', () => {
    expect(metersToNauticalMiles(1852)).toBe(1)
    expect(toDisplayUnit('NM', 18_520)).toBe(10)
    expect(toDisplayUnit('W', 750)).toBe(750)
  })

  test('revolutions est en hertz : 25 Hz = 1500 tr/min', () => {
    expect(hzToRpm(25)).toBe(1500)
  })

  test('angles : radians vers degrés, ramenés dans [0, 360[', () => {
    expect(radToDegrees(Math.PI)).toBeCloseTo(180)
    expect(normalizeDegrees(-90)).toBe(270)
    expect(normalizeDegrees(450)).toBe(90)
    expect(toDisplayUnit('°', -Math.PI / 2)).toBeCloseTo(270)
  })

  test('toDisplayUnit suit l’unité du catalogue, et laisse passer l’inconnue', () => {
    expect(toDisplayUnit('kn', 0.514444)).toBeCloseTo(1, 4)
    expect(toDisplayUnit('L', 0.2)).toBeCloseTo(200)
    expect(toDisplayUnit('L/h', 0.00001)).toBeCloseTo(36)
    expect(toDisplayUnit('inconnue', 7)).toBe(7)
    expect(toDisplayUnit(null, 7)).toBe(7)
  })
})
