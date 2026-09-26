import { test } from '@japa/runner'
import DashboardService from '#services/dashboard_service'
import PortService from '#services/port_service'
import BoatSafetyComplianceService from '#services/boat_safety_compliance_service'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import { DateTime } from 'luxon'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatMaintenanceTaskFactory } from '#database/factories/boat_maintenance_task_factory'
import { BoatSafetyEquipmentFactory } from '#database/factories/boat_safety_equipment_factory'

test.group('DashboardService (unit)', () => {
  test('urgent maintenance includes overdue and due-soon tasks by dueAt', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const today = DateTime.now().startOf('day')

    await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'boat',
      status: 'open',
      dueAt: today.minus({ days: 1 }),
      title: 'Overdue',
      notes: null,
      boatEngineId: null,
      boatSailId: null,
      boatRigId: null,
      doneAt: null,
      doneEngineHours: null,
      lastDoneEngineHours: null,
      dueEngineHours: null,
      recurrenceIntervalMonths: null,
      recurrenceIntervalEngineHours: null,
    })

    await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'boat',
      status: 'open',
      dueAt: today.plus({ days: 3 }),
      title: 'Soon',
      notes: null,
      boatEngineId: null,
      boatSailId: null,
      boatRigId: null,
      doneAt: null,
      doneEngineHours: null,
      lastDoneEngineHours: null,
      dueEngineHours: null,
      recurrenceIntervalMonths: null,
      recurrenceIntervalEngineHours: null,
    })

    await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'boat',
      status: 'open',
      dueAt: today.plus({ days: 40 }),
      title: 'Later',
      notes: null,
      boatEngineId: null,
      boatSailId: null,
      boatRigId: null,
      doneAt: null,
      doneEngineHours: null,
      lastDoneEngineHours: null,
      dueEngineHours: null,
      recurrenceIntervalMonths: null,
      recurrenceIntervalEngineHours: null,
    })

    await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'boat',
      status: 'open',
      dueAt: null,
      dueEngineHours: null,
      title: 'Undated to-do',
    })

    const svc = new DashboardService(new PortService(), new BoatSafetyComplianceService())
    const data = await svc.getForUser(user, { urgentWithinDays: 14, urgentLimit: 10 })

    assert.equal(data.urgentMaintenance.length, 2)
    assert.equal(data.urgentMaintenance[0]!.title, 'Overdue')
    assert.equal(data.urgentMaintenance[1]!.title, 'Soon')
    assert.equal(data.urgentMaintenance[0]!.kind, 'date')
  })

  test('urgent maintenance includes engine-hour tasks when within threshold', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id, hours: 95 }).create()

    await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'engine',
      status: 'open',
      title: 'Oil change @ 100h',
      notes: null,
      boatEngineId: engine.id,
      boatSailId: null,
      boatRigId: null,
      dueAt: null,
      dueEngineHours: 100,
      recurrenceIntervalEngineHours: 50,
      recurrenceIntervalMonths: null,
      doneAt: null,
      doneEngineHours: null,
      lastDoneEngineHours: null,
    })

    const svc = new DashboardService(new PortService(), new BoatSafetyComplianceService())
    const data = await svc.getForUser(user, { urgentWithinEngineHours: 10, urgentLimit: 10 })

    assert.equal(data.urgentMaintenance.length, 1)
    assert.equal(data.urgentMaintenance[0]!.kind, 'hours')
    assert.equal(data.urgentMaintenance[0]!.dueEngineHours, 100)
    assert.equal(data.urgentMaintenance[0]!.currentEngineHours, 95)
  })

  test('stats count every urgent task even beyond the display limit (#832)', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const today = DateTime.now().startOf('day')

    await BoatMaintenanceTaskFactory.merge({ boatId: boat.id }).apply('overdue').createMany(12)
    await BoatMaintenanceTaskFactory.merge({
      boatId: boat.id,
      dueAt: today.plus({ days: 3 }),
    }).createMany(3)
    // Hors fenêtre : ni comptée ni listée
    await BoatMaintenanceTaskFactory.merge({
      boatId: boat.id,
      dueAt: today.plus({ days: 40 }),
    }).create()

    const svc = new DashboardService(new PortService(), new BoatSafetyComplianceService())
    const data = await svc.getForUser(user, { urgentWithinDays: 14, urgentLimit: 10 })

    assert.equal(data.urgentMaintenance.length, 10)
    assert.equal(data.stats.urgentMaintenance, 15)
    assert.equal(data.stats.deltas.overdueCount, 12)
    assert.equal(data.stats.deltas.boatsInAlert, 1)
    assert.deepEqual(data.boatIds, [boat.id])
  })

  test('boatIds lists the organization boats and stays empty without organization', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const a = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const b = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const svc = new DashboardService(new PortService(), new BoatSafetyComplianceService())
    const data = await svc.getForUser(user)
    assert.sameMembers(data.boatIds, [a.id, b.id])

    const orphan = await UserFactory.merge({ organizationId: null }).create()
    const empty = await svc.getForUser(orphan)
    assert.deepEqual(empty.boatIds, [])
    assert.equal(empty.stats.urgentMaintenance, 0)
  })
})

test.group('DashboardService.getSafetyCompliance (widget « Conformité sécurité »)', () => {
  const service = () => new DashboardService(new PortService(), new BoatSafetyComplianceService())

  test('summarises the Division 240 report of each boat, worst gaps first, capped', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const orgId = user.organizationId!
    const today = DateTime.now().startOf('day')

    // Conforme : zone basique, tout l'armement présent, sans échéance.
    const compliant = await BoatFactory.merge({
      organizationId: orgId,
      name: 'Conforme',
      armamentZone: 'basic',
      maxPersons: 2,
      propulsionType: 'motorboat',
    }).create()
    for (const [type, quantity] of [
      ['life_jacket', 2],
      ['bilge_pump', 1],
      ['anchor', 1],
      ['fire_extinguisher', 1],
    ] as const) {
      await BoatSafetyEquipmentFactory.merge({
        boatId: compliant.id,
        equipmentType: type,
        quantity,
        purchasedAt: null,
      }).create()
    }

    // Écarts bloquants : côtier, gilets insuffisants, feux périmés, le reste manquant.
    const failing = await BoatFactory.merge({
      organizationId: orgId,
      name: 'En défaut',
      armamentZone: 'coastal',
      maxPersons: 4,
      propulsionType: 'motorboat',
    }).create()
    await BoatSafetyEquipmentFactory.merge({
      boatId: failing.id,
      equipmentType: 'life_jacket',
      quantity: 1,
      purchasedAt: null,
    }).create()
    await BoatSafetyEquipmentFactory.merge({
      boatId: failing.id,
      equipmentType: 'flare',
      quantity: 3,
      expiryDate: today.minus({ days: 3 }),
      purchasedAt: null,
    }).create()

    // Alerte seule : tout présent, extincteur dont la révision annuelle approche.
    const warning = await BoatFactory.merge({
      organizationId: orgId,
      name: 'À surveiller',
      armamentZone: 'basic',
      maxPersons: 1,
      propulsionType: 'motorboat',
    }).create()
    for (const type of ['life_jacket', 'bilge_pump', 'anchor'] as const) {
      await BoatSafetyEquipmentFactory.merge({
        boatId: warning.id,
        equipmentType: type,
        quantity: 1,
        purchasedAt: null,
      }).create()
    }
    await BoatSafetyEquipmentFactory.merge({
      boatId: warning.id,
      equipmentType: 'fire_extinguisher',
      quantity: 1,
      expiryDate: null,
      purchasedAt: today.minus({ months: 12 }).plus({ days: 10 }),
    }).create()

    // Sans zone : aucun contrôle.
    const noZone = await BoatFactory.merge({ organizationId: orgId, armamentZone: null }).create()

    const boatIds = [compliant.id, failing.id, warning.id, noZone.id]
    const summary = await service().getSafetyCompliance(boatIds)

    assert.equal(summary.checked, 3)
    assert.equal(summary.compliant, 1)
    assert.equal(summary.withIssues, 2)
    assert.equal(summary.withoutZone, 1)
    assert.deepEqual(
      summary.items.map((item) => item.boatName),
      ['En défaut', 'À surveiller']
    )
    const [worst, soon] = summary.items
    assert.equal(worst!.zone, 'coastal')
    assert.isAbove(worst!.blockingCount, 0)
    assert.isBelow(worst!.score, 100)
    assert.equal(worst!.nextDueDate, today.minus({ days: 3 }).toISODate())
    assert.equal(soon!.blockingCount, 0)
    assert.equal(soon!.warningCount, 1)
    assert.equal(soon!.score, 100)
    assert.equal(soon!.nextDueDate, today.plus({ days: 10 }).toISODate())

    const capped = await service().getSafetyCompliance(boatIds, { limit: 1 })
    assert.lengthOf(capped.items, 1)
    assert.equal(capped.withIssues, 2)

    assert.deepEqual(await service().getSafetyCompliance([]), {
      checked: 0,
      compliant: 0,
      withIssues: 0,
      withoutZone: 0,
      items: [],
    })
  })
})
