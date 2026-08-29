import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Notification from '#models/notification'
import BoatDocument from '#models/boat_document'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import OrganizationMembership from '#models/organization_membership'
import NotificationScanService from '#services/notification_scan_service'
import NotificationService from '#services/notification_service'
import { UserFactory } from '#database/factories/user_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatSafetyEquipmentFactory } from '#database/factories/boat_safety_equipment_factory'

function makeService() {
  return new NotificationScanService(new NotificationService())
}

async function seedFleetWithOverdueItems() {
  const org = await OrganizationFactory.create()
  const admin = await UserFactory.merge({ organizationId: org.id }).create()
  await OrganizationMembership.create({ userId: admin.id, organizationId: org.id, role: 'admin' })
  const member = await UserFactory.merge({ organizationId: org.id }).create()
  await OrganizationMembership.create({
    userId: member.id,
    organizationId: org.id,
    role: 'member',
  })

  const boat = await BoatFactory.merge({ organizationId: org.id }).create()
  const yesterday = DateTime.now().startOf('day').minus({ days: 1 })

  await BoatMaintenanceTask.create({
    boatId: boat.id,
    subject: 'boat',
    status: 'open',
    dueAt: yesterday,
    title: 'Overdue task',
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

  await BoatDocument.create({
    boatId: boat.id,
    organizationId: org.id,
    type: 'insurance',
    expiresAt: yesterday,
  })

  await BoatSafetyEquipmentFactory.merge({ boatId: boat.id, expiryDate: yesterday }).create()

  return { org, admin, member, boat }
}

test.group('NotificationScanService (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('creates overdue/expired notifications for admins only', async ({ assert }) => {
    const { admin, member } = await seedFleetWithOverdueItems()

    const { created } = await makeService().run()
    assert.equal(created, 3)

    const adminNotifs = await Notification.query().where('userId', admin.id)
    const types = adminNotifs.map((n) => n.type).sort()
    assert.deepEqual(types, ['document.expired', 'maintenance.overdue', 'safety_equipment.expired'])

    const memberNotifs = await Notification.query().where('userId', member.id)
    assert.lengthOf(memberNotifs, 0)
  })

  test('is idempotent — a second run creates no duplicate (dedup window)', async ({ assert }) => {
    const { admin } = await seedFleetWithOverdueItems()

    const first = await makeService().run()
    assert.equal(first.created, 3)

    const second = await makeService().run()
    assert.equal(second.created, 0)

    const notifs = await Notification.query().where('userId', admin.id)
    assert.lengthOf(notifs, 3)
  })

  test('does not notify for items outside the windows', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const admin = await UserFactory.merge({ organizationId: org.id }).create()
    await OrganizationMembership.create({ userId: admin.id, organizationId: org.id, role: 'admin' })
    const boat = await BoatFactory.merge({ organizationId: org.id }).create()

    // Due far in the future (beyond the 30-day due-soon window).
    await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'boat',
      status: 'open',
      dueAt: DateTime.now().startOf('day').plus({ days: 90 }),
      title: 'Far task',
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

    const { created } = await makeService().run()
    assert.equal(created, 0)
  })
})

/**
 * Durées de vie par défaut du corpus Division 240 (#582) : un équipement sans
 * date de péremption saisie mais avec une date d'achat est daté par son type.
 */
test.group('NotificationScanService — durées de vie par défaut (#582)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function seedOrgWithBoat() {
    const org = await OrganizationFactory.create()
    const admin = await UserFactory.merge({ organizationId: org.id }).create()
    await OrganizationMembership.create({ userId: admin.id, organizationId: org.id, role: 'admin' })
    const boat = await BoatFactory.merge({ organizationId: org.id }).create()
    return { org, admin, boat }
  }

  test('notifie sur une durée de vie dépassée, sans date de péremption saisie', async ({
    assert,
  }) => {
    const { admin, boat } = await seedOrgWithBoat()

    // Fusées achetées il y a 5 ans : périmées depuis 2 ans (durée de vie 3 ans).
    await BoatSafetyEquipmentFactory.merge({
      boatId: boat.id,
      equipmentType: 'flare',
      expiryDate: null,
      purchasedAt: DateTime.now().startOf('day').minus({ years: 5 }),
    }).create()

    const { created } = await makeService().run()
    assert.equal(created, 1)

    const notifs = await Notification.query().where('userId', admin.id)
    assert.deepEqual(
      notifs.map((n) => n.type),
      ['safety_equipment.expired']
    )
  })

  test('n’invente pas d’échéance pour un type sans durée de vie au corpus', async ({ assert }) => {
    const { boat } = await seedOrgWithBoat()

    await BoatSafetyEquipmentFactory.merge({
      boatId: boat.id,
      equipmentType: 'radar',
      expiryDate: null,
      purchasedAt: DateTime.now().startOf('day').minus({ years: 20 }),
    }).create()

    const { created } = await makeService().run()
    assert.equal(created, 0)
  })

  test('ne notifie pas deux fois un bateau cumulant date saisie et durée de vie', async ({
    assert,
  }) => {
    const { admin, boat } = await seedOrgWithBoat()

    await BoatSafetyEquipmentFactory.merge({
      boatId: boat.id,
      equipmentType: 'life_raft',
      expiryDate: DateTime.now().startOf('day').minus({ days: 1 }),
      purchasedAt: null,
    }).create()
    await BoatSafetyEquipmentFactory.merge({
      boatId: boat.id,
      equipmentType: 'flare',
      expiryDate: null,
      purchasedAt: DateTime.now().startOf('day').minus({ years: 5 }),
    }).create()

    const { created } = await makeService().run()
    assert.equal(created, 1)

    const notification = await Notification.query().where('userId', admin.id).firstOrFail()
    assert.equal(notification.type, 'safety_equipment.expired')
    assert.equal((notification.metadata as { count: number }).count, 2)
  })

  test('une durée de vie qui arrive à échéance passe en « bientôt »', async ({ assert }) => {
    const { admin, boat } = await seedOrgWithBoat()

    // Extincteur acheté il y a presque un an : vérification annuelle due sous 30 jours.
    await BoatSafetyEquipmentFactory.merge({
      boatId: boat.id,
      equipmentType: 'fire_extinguisher',
      expiryDate: null,
      purchasedAt: DateTime.now().startOf('day').minus({ months: 12 }).plus({ days: 10 }),
    }).create()

    const { created } = await makeService().run()
    assert.equal(created, 1)

    const notification = await Notification.query().where('userId', admin.id).firstOrFail()
    assert.equal(notification.type, 'safety_equipment.expiring_soon')
  })
})
