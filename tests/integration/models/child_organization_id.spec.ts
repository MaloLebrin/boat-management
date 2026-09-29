import { test } from '@japa/runner'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatMaintenanceEventFactory } from '#database/factories/boat_maintenance_event_factory'
import { BoatMaintenanceTaskFactory } from '#database/factories/boat_maintenance_task_factory'
import { UserFactory } from '#database/factories/user_factory'

/**
 * La colonne dénormalisée est remplie même quand l'appelant ne la passe pas
 * (#855) — c'est le cas des fabriques et des seeders.
 */
test.group('organization_id dénormalisé sur les enfants du bateau', () => {
  test('un événement hérite de l’organisation du bateau', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const event = await BoatMaintenanceEventFactory.merge({ boatId: boat.id }).create()

    assert.equal(event.organizationId, boat.organizationId)
  })

  test('une tâche hérite de l’organisation du bateau', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const task = await BoatMaintenanceTaskFactory.merge({ boatId: boat.id }).create()

    assert.equal(task.organizationId, boat.organizationId)
  })
})
