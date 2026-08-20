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
