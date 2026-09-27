import { test } from '@japa/runner'
import { BoatFactory } from '#database/factories/boat_factory'
import BoatGenericEquipment from '#models/boat_generic_equipment'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import { createAdminUser } from '#tests/functional/helpers'
import { truncateDb } from '#tests/utils/db'

/**
 * La tuile « Autre » de la modale d'ajout d'équipement (#893) crée un
 * équipement générique `category: 'other'` — plus un « bientôt disponible ».
 */
test.group('Équipement générique — catégorie « Autre » (#893)', (group) => {
  group.each.setup(() => truncateDb())

  test('POST crée un équipement de catégorie other', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/generic-equipment`)
      .form({ category: 'other', name: 'Annexe', brand: 'Zodiac', notes: 'Rangée au garage' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    const [item] = await BoatGenericEquipment.query().where('boat_id', boat.id)
    assert.equal(item.category, 'other')
    assert.equal(item.name, 'Annexe')
    assert.equal(item.brand, 'Zodiac')
  })

  test('une tâche rattachée à un équipement other prend le sujet other', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const item = await BoatGenericEquipment.create({
      boatId: boat.id,
      category: 'other',
      name: 'Annexe',
    })

    await client
      .post(`/boats/${boat.id}/maintenance-tasks`)
      .loginAs(user)
      .form({ title: 'Regonfler l’annexe', boatGenericEquipmentId: String(item.id) })

    const task = await BoatMaintenanceTask.query().where('boatId', boat.id).firstOrFail()
    assert.equal(task.subject, 'other')
    assert.equal(task.boatGenericEquipmentId, item.id)
  })
})
