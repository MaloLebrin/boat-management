import {
  MAINTENANCE_OPERATIONS,
  MAINTENANCE_OPERATION_INDEX,
} from '#shared/constants/maintenance/maintenance_operations'
import { MAINTENANCE_SUBJECTS } from '#shared/constants/maintenance/maintenance_subjects'
import {
  listMaintenanceOperations,
  resolveEngineFamily,
} from '#shared/helpers/maintenance_operations'
import { createBoatMaintenanceValidator } from '#validators/boat_maintenance'
import { createBoatMaintenanceTaskValidator } from '#validators/boat_maintenance_task'
import { test } from '@japa/runner'

/**
 * Catalogue d'opérations de maintenance standard (#581).
 *
 * L'invariant du lot est le même que pour le catalogue de bateaux (#571) :
 * le corpus assiste la saisie, il ne la contraint pas. Un titre hors catalogue
 * doit rester accepté tel quel par les deux validators.
 */
test.group("Catalogue d'opérations — corpus", () => {
  test('couvre les 10 sujets avec au moins 60 opérations', ({ assert }) => {
    assert.isAtLeast(MAINTENANCE_OPERATIONS.length, 60)
    for (const subject of MAINTENANCE_SUBJECTS) {
      assert.isTrue(
        MAINTENANCE_OPERATIONS.some((operation) => operation.subject === subject),
        `aucune opération pour le sujet ${subject}`
      )
    }
  })

  test('expose des clés uniques et stables, préfixées par leur sujet', ({ assert }) => {
    assert.equal(MAINTENANCE_OPERATION_INDEX.size, MAINTENANCE_OPERATIONS.length)
    for (const operation of MAINTENANCE_OPERATIONS) {
      assert.isTrue(operation.key.startsWith(`${operation.subject}.`), operation.key)
      assert.equal(operation.labelKey, `maintenance.operations.${operation.key}.label`)
    }
  })

  test('écarte les opérations incohérentes avec la famille du moteur', ({ assert }) => {
    const diesel = listMaintenanceOperations({
      subject: 'engine',
      engineFamilies: [resolveEngineFamily('inboard', 'diesel')!],
    }).map((operation) => operation.key)

    assert.include(diesel, 'engine.oil_change')
    assert.notInclude(diesel, 'engine.spark_plugs')

    const petrol = listMaintenanceOperations({
      subject: 'engine',
      engineFamilies: [resolveEngineFamily('outboard', 'essence')!],
    }).map((operation) => operation.key)

    assert.include(petrol, 'engine.spark_plugs')
    assert.notInclude(petrol, 'engine.injectors')
  })
})

test.group('Validators maintenance — titre et sujet', () => {
  test('acceptent un titre du catalogue comme une saisie libre', async ({ assert }) => {
    const freeText = 'Réparation de la maison du davier'

    const task = await createBoatMaintenanceTaskValidator.validate({
      subject: 'engine',
      title: freeText,
    })
    assert.equal(task.title, freeText)

    const event = await createBoatMaintenanceValidator.validate({
      subject: 'engine',
      performedAt: '2026-05-01',
      title: freeText,
    })
    assert.equal(event.title, freeText)
  })

  test('acceptent les 10 sujets du vocabulaire partagé', async ({ assert }) => {
    for (const subject of MAINTENANCE_SUBJECTS) {
      const payload = await createBoatMaintenanceTaskValidator.validate({
        subject,
        title: 'Contrôle',
      })
      assert.equal(payload.subject, subject)
    }
  })

  test('rejettent un sujet hors vocabulaire', async ({ assert }) => {
    await assert.rejects(() =>
      createBoatMaintenanceTaskValidator.validate({ subject: 'moteur', title: 'Vidange' })
    )
  })

  test('plafonnent le titre d’une tâche à 200 caractères, comme un événement', async ({
    assert,
  }) => {
    await assert.rejects(() =>
      createBoatMaintenanceTaskValidator.validate({
        subject: 'boat',
        title: 'a'.repeat(201),
      })
    )

    const payload = await createBoatMaintenanceTaskValidator.validate({
      subject: 'boat',
      title: 'a'.repeat(200),
    })
    assert.lengthOf(payload.title, 200)
  })

  test('conservent les intervalles de récurrence pré-remplis par le catalogue', async ({
    assert,
  }) => {
    const operation = MAINTENANCE_OPERATION_INDEX.get('engine.oil_change')!

    const payload = await createBoatMaintenanceTaskValidator.validate({
      subject: operation.subject,
      title: 'Vidange moteur',
      recurrenceIntervalMonths: String(operation.defaultIntervalMonths),
      recurrenceIntervalEngineHours: String(operation.defaultIntervalEngineHours),
    })

    assert.equal(payload.recurrenceIntervalMonths, operation.defaultIntervalMonths)
    assert.equal(payload.recurrenceIntervalEngineHours, operation.defaultIntervalEngineHours)
  })
})
