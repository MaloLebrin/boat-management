import { test } from '@japa/runner'
import BoatEquipmentService, { BoatEquipmentNotFoundError } from '#services/boat_equipment_service'
import BoatEngineService from '#services/boat_engine_service'
import BoatSailService from '#services/boat_sail_service'
import BoatRigService from '#services/boat_rig_service'
import BoatEnginePartService from '#services/boat_engine_part_service'
import BoatSafetyEquipmentService from '#services/boat_safety_equipment_service'
import Organization from '#models/organization'
import User from '#models/user'
import Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'

test.group('BoatService equipment (unit)', (group) => {
  group.each.teardown(async () => {
    await BoatEngine.query().delete()
    await Boat.query().delete()
    await User.query().delete()
    await Organization.query().delete()
  })

  test('updateEngine rejects engine id belonging to another boat', async ({ assert }) => {
    const org = await Organization.create({ name: 'O', slug: 'o-eq-1' })
    const user = await User.create({
      email: 'eq1@example.com',
      password: 'Password123!',
      fullName: 'Eq1',
      organizationId: org.id,
    })
    const boatA = await Boat.create({
      organizationId: org.id,
      name: 'A',
      registrationNumber: null,
      type: null,
    })
    const boatB = await Boat.create({
      organizationId: org.id,
      name: 'B',
      registrationNumber: null,
      type: null,
    })
    const engineB = await BoatEngine.create({
      boatId: boatB.id,
      kind: 'outboard',
      fuel: 'essence',
      brand: 'Yamaha',
      model: 'F20',
      serialNumber: null,
      powerHp: 20,
      hours: null,
    })

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
