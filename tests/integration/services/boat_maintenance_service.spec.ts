import { test } from '@japa/runner'
import BoatMaintenanceService, {
  BoatMaintenanceValidationError,
} from '#services/boat_maintenance_service'
import BoatService from '#services/boat_service'
import BoatEquipmentService from '#services/boat_equipment_service'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatEnginePartFactory } from '#database/factories/boat_engine_part_factory'
import app from '@adonisjs/core/services/app'

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

  test('createForBoat throws engineCaptionRequired when engine subject has no caption', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const svc = new BoatMaintenanceService()
    let caught: unknown
    try {
      await svc.createForBoat(user, boat, {
        subject: 'engine',
        performedAt: '2024-06-01',
        title: 'Missing caption',
      })
    } catch (err) {
      caught = err
    }
    assert.instanceOf(caught, BoatMaintenanceValidationError)
    assert.equal((caught as BoatMaintenanceValidationError).errorCode, 'engineCaptionRequired')
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
    const boatService = await app.container.make(BoatService)
    const equipmentService = await app.container.make(BoatEquipmentService)
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

  test('createForBoat clamps stock to 0 when quantity exceeds available stock', async ({
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
      performedAt: '2024-10-15',
      title: 'Overconsumption test',
      parts: [{ name: 'Part', quantity: '5', enginePartId: catalogPart.id }],
    })

    await catalogPart.refresh()
    assert.equal(catalogPart.stock, 0)
    assert.equal(catalogPart.wearState, 'to_replace')
  })

  test('createForBoat does not overwrite damaged wearState when stock reaches zero', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    const catalogPart = await BoatEnginePartFactory.merge({
      boatEngineId: engine.id,
      stock: 1,
      wearState: 'damaged',
    }).create()

    const svc = new BoatMaintenanceService()
    await svc.createForBoat(user, boat, {
      subject: 'engine',
      boatEngineId: engine.id,
      performedAt: '2024-10-20',
      title: 'Damaged part usage',
      parts: [{ name: 'Part', quantity: '1', enginePartId: catalogPart.id }],
    })

    await catalogPart.refresh()
    assert.equal(catalogPart.stock, 0)
    assert.equal(catalogPart.wearState, 'damaged')
  })

  test('createForBoat preserves null stock when stock is not tracked', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    const catalogPart = await BoatEnginePartFactory.merge({
      boatEngineId: engine.id,
      stock: null,
      wearState: 'good',
    }).create()

    const svc = new BoatMaintenanceService()
    await svc.createForBoat(user, boat, {
      subject: 'engine',
      boatEngineId: engine.id,
      performedAt: '2024-10-25',
      title: 'Null stock usage',
      parts: [{ name: 'Part', quantity: '2', enginePartId: catalogPart.id }],
    })

    await catalogPart.refresh()
    assert.isNull(catalogPart.stock)
    assert.equal(catalogPart.wearState, 'good')
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
    const event = events.data.find((e) => e.title === 'Varnish')
    assert.isDefined(event)
    assert.equal(event!.totalCost, 83)
    assert.equal(stats.totalCost, 83)
  })

  test('getHistoryForOrg returns empty result for user without organization', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const svc = new BoatMaintenanceService()

    const { events, stats, boatOptions } = await svc.getHistoryForOrg(user)
    assert.lengthOf(events.data, 0)
    assert.equal(events.meta.total, 0)
    assert.equal(stats.totalEvents, 0)
    assert.lengthOf(boatOptions, 0)
  })

  test('getHistoryForOrg filters by subject', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const svc = new BoatMaintenanceService()
    await svc.createForBoat(user, boat, {
      subject: 'boat',
      performedAt: '2024-01-01',
      title: 'Hull',
    })
    await svc.createForBoat(user, boat, {
      subject: 'hull',
      performedAt: '2024-02-01',
      title: 'Keel',
    })

    const { events, stats } = await svc.getHistoryForOrg(user, { subject: 'hull' })
    assert.lengthOf(events.data, 1)
    assert.equal(events.data[0]!.subject, 'hull')
    assert.equal(stats.totalEvents, 1)
  })

  test('getHistoryForOrg filters by boat and ignores boatId outside the org', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const boatA = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const boatB = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const svc = new BoatMaintenanceService()
    await svc.createForBoat(user, boatA, { subject: 'boat', performedAt: '2024-01-01', title: 'A' })
    await svc.createForBoat(user, boatB, { subject: 'boat', performedAt: '2024-01-02', title: 'B' })

    const scoped = await svc.getHistoryForOrg(user, { boatId: String(boatA.id) })
    assert.lengthOf(scoped.events.data, 1)
    assert.equal(scoped.events.data[0]!.boatId, boatA.id)

    // A boatId that does not belong to the org is ignored → all events returned.
    const ignored = await svc.getHistoryForOrg(user, { boatId: '999999' })
    assert.lengthOf(ignored.events.data, 2)
  })

  test('getHistoryForOrg filters by date range', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const svc = new BoatMaintenanceService()
    await svc.createForBoat(user, boat, {
      subject: 'boat',
      performedAt: '2024-01-15',
      title: 'Jan',
    })
    await svc.createForBoat(user, boat, {
      subject: 'boat',
      performedAt: '2024-06-15',
      title: 'Jun',
    })
    await svc.createForBoat(user, boat, {
      subject: 'boat',
      performedAt: '2024-12-15',
      title: 'Dec',
    })

    const { events } = await svc.getHistoryForOrg(user, {
      dateFrom: '2024-03-01',
      dateTo: '2024-09-01',
    })
    assert.deepEqual(
      events.data.map((e) => e.title),
      ['Jun']
    )
  })

  test('getHistoryForOrg searches by title or boat name', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const marlin = await BoatFactory.merge({
      organizationId: user.organizationId!,
      name: 'Blue Marlin',
    }).create()
    const other = await BoatFactory.merge({
      organizationId: user.organizationId!,
      name: 'Sea Breeze',
    }).create()
    const svc = new BoatMaintenanceService()
    await svc.createForBoat(user, other, {
      subject: 'boat',
      performedAt: '2024-01-01',
      title: 'Oil change',
    })
    await svc.createForBoat(user, marlin, {
      subject: 'boat',
      performedAt: '2024-02-01',
      title: 'Antifouling',
    })

    const byTitle = await svc.getHistoryForOrg(user, { q: 'oil' })
    assert.deepEqual(
      byTitle.events.data.map((e) => e.title),
      ['Oil change']
    )

    const byBoat = await svc.getHistoryForOrg(user, { q: 'marlin' })
    assert.deepEqual(
      byBoat.events.data.map((e) => e.boatName),
      ['Blue Marlin']
    )
  })

  test('getHistoryForOrg paginates and sorts, stats span the whole filtered set', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const svc = new BoatMaintenanceService()
    for (let i = 1; i <= 7; i++) {
      const day = String(i).padStart(2, '0')
      await svc.createForBoat(user, boat, {
        subject: 'boat',
        performedAt: `2024-03-${day}`,
        title: `Event ${i}`,
      })
    }

    const firstPage = await svc.getHistoryForOrg(user, { page: '1', perPage: '5', sort: 'recent' })
    assert.lengthOf(firstPage.events.data, 5)
    assert.equal(firstPage.events.meta.total, 7)
    assert.equal(firstPage.events.meta.lastPage, 2)
    // recent → most recent day first.
    assert.equal(firstPage.events.data[0]!.title, 'Event 7')
    // stats reflect the full filtered set, not just the page.
    assert.equal(firstPage.stats.totalEvents, 7)

    const oldest = await svc.getHistoryForOrg(user, { perPage: '5', sort: 'oldest' })
    assert.equal(oldest.events.data[0]!.title, 'Event 1')
  })

  test('getHistoryForOrg excludes events from other organizations', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const otherUser = await UserFactory.with('organization').create()
    const otherBoat = await BoatFactory.merge({
      organizationId: otherUser.organizationId!,
    }).create()
    const svc = new BoatMaintenanceService()
    await svc.createForBoat(user, boat, {
      subject: 'boat',
      performedAt: '2024-01-01',
      title: 'Mine',
    })
    await svc.createForBoat(otherUser, otherBoat, {
      subject: 'boat',
      performedAt: '2024-01-02',
      title: 'Theirs',
    })

    const { events, stats } = await svc.getHistoryForOrg(user)
    assert.deepEqual(
      events.data.map((e) => e.title),
      ['Mine']
    )
    assert.equal(stats.totalEvents, 1)
  })
})
