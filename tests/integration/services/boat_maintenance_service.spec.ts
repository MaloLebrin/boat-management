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
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatEnginePartFactory } from '#database/factories/boat_engine_part_factory'

test.group('BoatMaintenanceService (unit)', () => {
  test('createForBoat stores event and parts for engine subject', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()

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
    assert.include(event.engineCaption!, engine.brand!)
    await event.load('parts')
    assert.equal(event.parts.length, 1)
    assert.equal(event.parts[0]!.name, 'Oil filter')
  })

  test('createForBoat rejects engine from another boat', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boatA = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const boatB = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engineB = await BoatEngineFactory.merge({ boatId: boatB.id }).create()

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
    const user = await UserFactory.with('organization').create()
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
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

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
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    const catalogPart = await BoatEnginePartFactory.merge({
      boatEngineId: engine.id,
      stock: 5,
      wearState: 'good',
    }).create()

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
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    const catalogPart = await BoatEnginePartFactory.merge({
      boatEngineId: engine.id,
      stock: 1,
      wearState: 'good',
    }).create()

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
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

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
