import { test } from '@japa/runner'
import {
  decideRunTimeSync,
  engineRunTimePath,
  kelvinToCelsius,
  metersPerSecondToKnots,
  radiansToDegrees,
} from '#shared/helpers/instruments'

test.group('decideRunTimeSync (D6)', () => {
  test('sans base : la pose sans incrémenter', ({ assert }) => {
    assert.deepEqual(decideRunTimeSync(7_200.9, null), { action: 'init', baseS: 7_200 })
  })

  test('runTime sous la base : re-base (reset du calculateur)', ({ assert }) => {
    assert.deepEqual(decideRunTimeSync(120, 7_200), { action: 'rebase', baseS: 120 })
  })

  test('heures entières écoulées : incrémente', ({ assert }) => {
    assert.deepEqual(decideRunTimeSync(7_200 + 3 * 3600 + 1_800, 7_200), {
      action: 'increment',
      hours: 3,
    })
  })

  test('exactement une heure : incrémente d’une heure', ({ assert }) => {
    assert.deepEqual(decideRunTimeSync(3_600, 0), { action: 'increment', hours: 1 })
  })

  test('moins d’une heure : rien, le reliquat attend', ({ assert }) => {
    assert.deepEqual(decideRunTimeSync(7_200 + 3_599, 7_200), { action: 'none' })
  })

  test('valeur égale à la base : rien', ({ assert }) => {
    assert.deepEqual(decideRunTimeSync(7_200, 7_200), { action: 'none' })
  })
})

test.group('conversions Signal K', () => {
  test('chemin runTime d’un moteur', ({ assert }) => {
    assert.equal(engineRunTimePath('port'), 'propulsion.port.runTime')
  })

  test('m/s → nœuds', ({ assert }) => {
    assert.equal(metersPerSecondToKnots(1), 1.94)
    assert.equal(metersPerSecondToKnots(0), 0)
  })

  test('radians → degrés dans [0, 360)', ({ assert }) => {
    assert.equal(radiansToDegrees(Math.PI), 180)
    assert.equal(radiansToDegrees(0), 0)
    assert.equal(radiansToDegrees(-Math.PI / 2), 270)
    assert.equal(radiansToDegrees(2 * Math.PI), 0)
  })

  test('kelvin → °C', ({ assert }) => {
    assert.equal(kelvinToCelsius(273.15), 0)
    assert.equal(kelvinToCelsius(291.65), 18.5)
  })
})
