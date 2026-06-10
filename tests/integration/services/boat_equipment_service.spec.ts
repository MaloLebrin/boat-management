import { test } from '@japa/runner'
import BoatEquipmentService, { BoatEquipmentNotFoundError } from '#services/boat_equipment_service'
import BoatEngineService from '#services/boat_engine_service'
import BoatSailService from '#services/boat_sail_service'
import BoatRigService from '#services/boat_rig_service'
import BoatEnginePartService from '#services/boat_engine_part_service'
import BoatSafetyEquipmentService from '#services/boat_safety_equipment_service'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'

test.group('BoatService equipment (unit)', () => {
  test('updateEngine rejects engine id belonging to another boat', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boatA = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const boatB = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engineB = await BoatEngineFactory.merge({ boatId: boatB.id }).create()

    const svc = new BoatEquipmentService(
      new BoatEngineService(),
      new BoatSailService(),
      new BoatRigService(),
      new BoatEnginePartService(),
      new BoatSafetyEquipmentService()
    )
    await assert.rejects(
      () =>
        svc.updateEngine(user, boatA, engineB.id, {
          kind: 'outboard',
          fuel: 'essence',
          brand: 'Yamaha',
          model: 'F20',
          serialNumber: null,
          manufacturedAt: null,
          powerHp: 20,
          hours: null,
        }),
      BoatEquipmentNotFoundError
    )
  })
})
