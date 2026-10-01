import { test } from '@japa/runner'
import {
  dayRangeOverlaps,
  intervalsOverlap,
  navigationLogRoleFor,
} from '#shared/helpers/crew_planning'

test.group('Planning d’équipage (#883) — détection des chevauchements', () => {
  test('two time slots overlap only when they share an instant', ({ assert }) => {
    // [10, 20[ et [15, 25[ se recoupent.
    assert.isTrue(intervalsOverlap(10, 20, 15, 25))
    // L'un contient l'autre.
    assert.isTrue(intervalsOverlap(10, 30, 15, 20))
    // Fin exclue : un retour à 20 n'empêche pas un départ à 20.
    assert.isFalse(intervalsOverlap(10, 20, 20, 30))
    assert.isFalse(intervalsOverlap(20, 30, 10, 20))
    // Disjoints.
    assert.isFalse(intervalsOverlap(10, 20, 25, 30))
  })

  test('an unavailability covers its first and last days', ({ assert }) => {
    // Congés du 10 au 12, embarquement le 12 → conflit.
    assert.isTrue(dayRangeOverlaps('2026-10-10', '2026-10-12', '2026-10-12', '2026-10-14'))
    // Embarquement du 8 au 10 → conflit sur le 10.
    assert.isTrue(dayRangeOverlaps('2026-10-10', '2026-10-12', '2026-10-08', '2026-10-10'))
    // Embarquement du 13 → libre.
    assert.isFalse(dayRangeOverlaps('2026-10-10', '2026-10-12', '2026-10-13', '2026-10-15'))
    // Embarquement le 9 → libre.
    assert.isFalse(dayRangeOverlaps('2026-10-10', '2026-10-12', '2026-10-09', '2026-10-09'))
    // Une journée d'indisponibilité au milieu d'une croisière.
    assert.isTrue(dayRangeOverlaps('2026-10-11', '2026-10-11', '2026-10-08', '2026-10-15'))
  })

  test('maps reservation roles onto the logbook vocabulary', ({ assert }) => {
    assert.equal(navigationLogRoleFor('skipper'), 'skipper')
    assert.equal(navigationLogRoleFor('crew'), 'crew')
    // Le journal de bord ne connaît pas « moniteur ».
    assert.equal(navigationLogRoleFor('instructor'), 'crew')
  })
})
