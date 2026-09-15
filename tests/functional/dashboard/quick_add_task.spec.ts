import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatGenericEquipmentFactory } from '#database/factories/boat_generic_equipment_factory'
import { BoatSafetyEquipmentFactory } from '#database/factories/boat_safety_equipment_factory'
import { createAdminUser } from '#tests/functional/helpers'
import type { BoatTaskEquipment } from '#shared/types/maintenance'

test.group('Dashboard — quick add task (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('exposes the create permission and loads the chosen boat equipment on demand', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const safety = await BoatSafetyEquipmentFactory.merge({ boatId: boat.id }).create()
    const generic = await BoatGenericEquipmentFactory.merge({ boatId: boat.id }).create()

    const page = await client.get('/dashboard').loginAs(admin).withInertia()
    page.assertInertiaComponent('dashboard')
    const pageProps = page.inertiaProps as { canCreateMaintenanceTasks: boolean }
    assert.isTrue(pageProps.canCreateMaintenanceTasks)
    assert.notProperty(page.inertiaProps, 'taskEquipment')

    const reload = await client
      .get(`/dashboard?taskBoatId=${boat.id}`)
      .loginAs(admin)
      .withInertiaPartialReload('dashboard', ['taskEquipment'])

    const { taskEquipment } = reload.inertiaProps as { taskEquipment: BoatTaskEquipment }
    assert.equal(taskEquipment.boatId, boat.id)
    assert.deepEqual(
      taskEquipment.equipment.safetyEquipment.map((s) => s.id),
      [safety.id]
    )
    assert.deepEqual(
      taskEquipment.equipment.genericEquipment.map((g) => g.id),
      [generic.id]
    )
  })

  test('never exposes the equipment of another organization boat', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const other = await createAdminUser()
    const foreignBoat = await BoatFactory.merge({ organizationId: other.organizationId! }).create()
    await BoatSafetyEquipmentFactory.merge({ boatId: foreignBoat.id }).create()

    const reload = await client
      .get(`/dashboard?taskBoatId=${foreignBoat.id}`)
      .loginAs(admin)
      .withInertiaPartialReload('dashboard', ['taskEquipment'])

    const { taskEquipment } = reload.inertiaProps as { taskEquipment: BoatTaskEquipment }
    assert.isNull(taskEquipment.boatId)
    assert.lengthOf(taskEquipment.equipment.safetyEquipment, 0)
  })
})
