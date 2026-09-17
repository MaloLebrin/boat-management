import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import Notification from '#models/notification'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import OrganizationMembership from '#models/organization_membership'
import ScanFleetNotifications from '#jobs/scan_fleet_notifications'
import { BoatFactory } from '#database/factories/boat_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { UserFactory } from '#database/factories/user_factory'

/**
 * Scan de flotte — cron quotidien 07:00 (#699).
 *
 * `NotificationScanService` est déjà très bien couvert par
 * `tests/functional/notifications/scan.spec.ts` — mais ce spec-là instancie le
 * service **à la main** (`new NotificationScanService(new NotificationService())`)
 * et ne passe jamais par le job.
 *
 * Autrement dit : un `ScanFleetNotifications.execute()` vidé de son corps
 * passerait la totalité des tests existants. Ce que ce fichier vérifie, c'est le
 * seul maillon que personne ne regardait — **le câblage** entre le cron et le
 * service. C'est vrai des sept crons : ils délèguent tous, et seul le délégué
 * était testé.
 */

async function run() {
  const job = await app.container.make(ScanFleetNotifications)
  await job.execute()
}

async function seedOrgWithOverdueTask() {
  const org = await OrganizationFactory.create()
  const admin = await UserFactory.merge({ organizationId: org.id }).create()
  await OrganizationMembership.create({ userId: admin.id, organizationId: org.id, role: 'admin' })

  const boat = await BoatFactory.merge({ organizationId: org.id }).create()
  await BoatMaintenanceTask.create({
    boatId: boat.id,
    subject: 'boat',
    status: 'open',
    dueAt: DateTime.now().startOf('day').minus({ days: 1 }),
    title: 'Vidange en retard',
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

  return { org, admin }
}

test.group('ScanFleetNotifications (cron 07:00)', () => {
  test('the job reaches the scan service and notifications appear', async ({ assert }) => {
    const { admin } = await seedOrgWithOverdueTask()

    await run()

    const notifications = await Notification.query().where('userId', admin.id)
    assert.isAbove(notifications.length, 0, 'le cron n’a produit aucune notification')
  })

  test('a second run the same day creates no duplicate', async ({ assert }) => {
    // Le cron tourne tous les jours et la fenêtre anti-doublon vit dans le
    // service ; on vérifie ici qu'elle tient **à travers le job**, puisque c'est
    // par lui que la production l'appelle.
    const { admin } = await seedOrgWithOverdueTask()

    await run()
    const afterFirst = await Notification.query().where('userId', admin.id)
    await run()
    const afterSecond = await Notification.query().where('userId', admin.id)

    assert.lengthOf(afterSecond, afterFirst.length)
  })

  test('an organization without a boat produces nothing', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const admin = await UserFactory.merge({ organizationId: org.id }).create()
    await OrganizationMembership.create({ userId: admin.id, organizationId: org.id, role: 'admin' })

    await run()

    assert.lengthOf(await Notification.query().where('userId', admin.id), 0)
  })
})
