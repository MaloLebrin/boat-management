import { test } from '@japa/runner'
import BoatMaintenanceService, {
  BoatMaintenanceValidationError,
} from '#services/boat_maintenance_service'
import BoatService from '#services/boat_service'
import BoatEquipmentService from '#services/boat_equipment_service'
import BoatEngineService from '#services/boat_engine_service'
import BoatSailService from '#services/boat_sail_service'
import BoatRigService from '#services/boat_rig_service'
import BoatEnginePartService from '#services/boat_engine_part_service'
import BoatSafetyEquipmentService from '#services/boat_safety_equipment_service'
import Organization from '#models/organization'
import User from '#models/user'
import Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'
import BoatEnginePart from '#models/boat_engine_part'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import BoatRig from '#models/boat_rig'
import BoatSail from '#models/boat_sail'

test.group('BoatMaintenanceService (unit)', (group) => {
  group.each.teardown(async () => {
    await BoatMaintenanceEvent.query().delete()
    await BoatEnginePart.query().delete()
    await BoatEngine.query().delete()
    await BoatSail.query().delete()
    await BoatRig.query().delete()
    await Boat.query().delete()
    await User.query().delete()
    await Organization.query().delete()
  })

  test('createForBoat stores event and parts for engine subject', async ({ assert }) => {
    const org = await Organization.create({ name: 'O', slug: 'o-maint-1' })
    const user = await User.create({
      email: 'm1@example.com',
      password: 'Password123!',
      fullName: 'M1',
      organizationId: org.id,
    })
    const boat = await Boat.create({
      organizationId: org.id,
      name: 'B',
      registrationNumber: null,
      type: null,
    })
    const engine = await BoatEngine.create({
      boatId: boat.id,
      kind: 'inboard',
      fuel: 'diesel',
      brand: 'Yanmar',
      model: '3YM',
      serialNumber: 'SN1',
      powerHp: 30,
      hours: 100,
    })

    const svc = new BoatMaintenanceService()
    const event = await svc.createForBoat(user, boat, {
      subject: 'engine',
      boatEngineId: engine.id,
      performedAt: '2024-06-01',
      title: 'Oil change',
      parts: [{ name: 'Oil filter', quantity: '1', notes: 'OEM' }],
    })

    assert.equal(event.subject, 'engine')
    assert.equal(event.boatEngineId, engine.id)
    assert.isString(event.engineCaption)
    assert.include(event.engineCaption!, 'Yanmar')
    await event.load('parts')
    assert.equal(event.parts.length, 1)
    assert.equal(event.parts[0]!.name, 'Oil filter')
  })

  test('createForBoat rejects engine from another boat', async ({ assert }) => {
    const org = await Organization.create({ name: 'O', slug: 'o-maint-2' })
    const user = await User.create({
      email: 'm2@example.com',
      password: 'Password123!',
      fullName: 'M2',
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

    const svc = new BoatMaintenanceService()
    await assert.rejects(
      () =>
        svc.createForBoat(user, boatA, {
          subject: 'engine',
          boatEngineId: engineB.id,
          performedAt: '2024-06-01',
          title: 'Bad',
        }),
      BoatMaintenanceValidationError
    )
  })

  test('createForBoat sail and rig subjects', async ({ assert }) => {
    const org = await Organization.create({ name: 'O', slug: 'o-maint-3' })
    const user = await User.create({
      email: 'm3@example.com',
      password: 'Password123!',
      fullName: 'M3',
      organizationId: org.id,
    })
    const boatService = new BoatService()
    const equipmentService = new BoatEquipmentService(
      new BoatEngineService(),
      new BoatSailService(),
      new BoatRigService(),
      new BoatEnginePartService(),
      new BoatSafetyEquipmentService()
    )
    const boat = await boatService.createForUser(user, {
      name: 'Sloop',
      propulsionType: 'sailboat',
      mastHeightM: 12,
    })
    await equipmentService.createSail(user, boat, { sailType: 'main', areaM2: 28 })
    await equipmentService.upsertRig(user, boat, { rigType: 'sloop', mastCount: 1 })

    await boat.load('sails')
    await boat.load('rig')
    const sail = boat.sails[0]!
    const rig = boat.rig!

    const svc = new BoatMaintenanceService()

    const sailEv = await svc.createForBoat(user, boat, {
      subject: 'sail',
      boatSailId: sail.id,
      performedAt: '2024-07-01',
      title: 'Re-stitching',
    })
    assert.equal(sailEv.subject, 'sail')
    assert.equal(sailEv.boatSailId, sail.id)
    assert.isString(sailEv.sailCaption)

    const rigEv = await svc.createForBoat(user, boat, {
      subject: 'rig',
      boatRigId: rig.id,
      performedAt: '2024-08-01',
      title: 'Standing rigging check',
    })
    assert.equal(rigEv.boatRigId, rig.id)
  })

  test('deleteForBoat removes event', async ({ assert }) => {
    const org = await Organization.create({ name: 'O', slug: 'o-maint-4' })
    const user = await User.create({
      email: 'm4@example.com',
      password: 'Password123!',
      fullName: 'M4',
      organizationId: org.id,
    })
    const boat = await Boat.create({
      organizationId: org.id,
      name: 'B',
      registrationNumber: null,
      type: null,
    })

    const svc = new BoatMaintenanceService()
    const ev = await svc.createForBoat(user, boat, {
      subject: 'boat',
      performedAt: '2024-01-01',
      title: 'Antifouling',
    })

    await svc.deleteForBoat(user, boat, ev.id)
    const found = await BoatMaintenanceEvent.find(ev.id)
    assert.isNull(found)
  })

  test('createForBoat decrements engine part stock when enginePartId is provided', async ({
    assert,
  }) => {
    const org = await Organization.create({ name: 'O', slug: 'o-maint-5' })
    const user = await User.create({
      email: 'm5@example.com',
      password: 'Password123!',
      fullName: 'M5',
      organizationId: org.id,
    })
    const boat = await Boat.create({
      organizationId: org.id,
      name: 'B5',
      registrationNumber: null,
      type: null,
    })
    const engine = await BoatEngine.create({
      boatId: boat.id,
      kind: 'inboard',
      fuel: 'diesel',
      brand: 'Volvo',
      model: 'D1',
      serialNumber: null,
      powerHp: 20,
      hours: 50,
    })
    const catalogPart = await BoatEnginePart.create({
      boatEngineId: engine.id,
      designation: 'Oil filter',
      stock: 5,
      wearState: 'good',
    })

    const svc = new BoatMaintenanceService()
    await svc.createForBoat(user, boat, {
      subject: 'engine',
      boatEngineId: engine.id,
      performedAt: '2024-09-01',
      title: 'Oil change',
      parts: [{ name: 'Oil filter', quantity: '2', enginePartId: catalogPart.id }],
    })

    await catalogPart.refresh()
    assert.equal(catalogPart.stock, 3)
  })

  test('createForBoat sets wearState to_replace when catalog part stock reaches zero', async ({
    assert,
  }) => {
    const org = await Organization.create({ name: 'O', slug: 'o-maint-6' })
    const user = await User.create({
      email: 'm6@example.com',
      password: 'Password123!',
      fullName: 'M6',
      organizationId: org.id,
    })
    const boat = await Boat.create({
      organizationId: org.id,
      name: 'B6',
      registrationNumber: null,
      type: null,
    })
    const engine = await BoatEngine.create({
      boatId: boat.id,
      kind: 'inboard',
      fuel: 'diesel',
      brand: 'Yanmar',
      model: '2YM',
      serialNumber: null,
      powerHp: 15,
      hours: 80,
    })
    const catalogPart = await BoatEnginePart.create({
      boatEngineId: engine.id,
      designation: 'Impeller',
      stock: 1,
      wearState: 'good',
    })

    const svc = new BoatMaintenanceService()
    await svc.createForBoat(user, boat, {
      subject: 'engine',
      boatEngineId: engine.id,
      performedAt: '2024-10-01',
      title: 'Impeller replacement',
      parts: [{ name: 'Impeller', quantity: '1', enginePartId: catalogPart.id }],
    })

    await catalogPart.refresh()
    assert.equal(catalogPart.stock, 0)
    assert.equal(catalogPart.wearState, 'to_replace')
  })

  test('createForBoat tracks unitPrice and getHistoryForOrg returns totalCost', async ({
    assert,
  }) => {
    const org = await Organization.create({ name: 'O', slug: 'o-maint-7' })
    const user = await User.create({
      email: 'm7@example.com',
      password: 'Password123!',
      fullName: 'M7',
      organizationId: org.id,
    })
    const boat = await Boat.create({
      organizationId: org.id,
      name: 'B7',
      registrationNumber: null,
      type: null,
    })

    const svc = new BoatMaintenanceService()
    await svc.createForBoat(user, boat, {
      subject: 'boat',
      performedAt: '2024-11-01',
      title: 'Varnish',
      parts: [
        { name: 'Varnish can', quantity: '2', unitPrice: '35.50' },
        { name: 'Brush', quantity: '3', unitPrice: '4.00' },
      ],
    })

    const { events, stats } = await svc.getHistoryForOrg(user)
    const event = events.find((e) => e.title === 'Varnish')
    assert.isDefined(event)
    assert.equal(event!.totalCost, 83)
    assert.equal(stats.totalCost, 83)
  })
})
