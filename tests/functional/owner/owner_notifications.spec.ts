import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatDocumentFactory } from '#database/factories/boat_document_factory'
import { BoatMaintenanceTaskFactory } from '#database/factories/boat_maintenance_task_factory'
import { ClientFactory } from '#database/factories/client_factory'
import { InvoiceFactory } from '#database/factories/invoice_factory'
import type Boat from '#models/boat'
import Notification from '#models/notification'
import type User from '#models/user'
import BoatIncidentService from '#services/boat_incident_service'
import BoatMaintenanceTaskService from '#services/boat_maintenance_task_service'
import InvoiceService from '#services/invoice_service'
import NotificationScanService from '#services/notification_scan_service'
import NotificationService from '#services/notification_service'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser, createBoatOwnerUser } from '#tests/functional/helpers'

/**
 * Notifications au propriétaire (#890) : travaux faits, incident déclaré,
 * facture qui lui est adressée, document qui expire. Seuls les propriétaires
 * **du bateau** sont visés — le témoin `stranger` est un propriétaire de la
 * même organisation, rattaché à un autre bateau.
 */

async function setup(): Promise<{ admin: User; owner: User; stranger: User; boat: Boat }> {
  const admin = await createAdminUser()
  const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
  const otherBoat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
  const owner = await createBoatOwnerUser(admin.organizationId!)
  const stranger = await createBoatOwnerUser(admin.organizationId!)
  await boat.related('owners').attach([owner.id])
  await otherBoat.related('owners').attach([stranger.id])
  return { admin, owner, stranger, boat }
}

async function typesOf(user: User): Promise<string[]> {
  const rows = await Notification.query().where('userId', user.id).orderBy('id', 'asc')
  return rows.map((row) => row.type)
}

test.group('Owner notifications (#890)', (group) => {
  group.each.setup(() => truncateDb())

  test('a completed task reaches the owners of that boat only', async ({ assert }) => {
    const { admin, owner, stranger, boat } = await setup()
    const task = await BoatMaintenanceTaskFactory.merge({
      boatId: boat.id,
      title: 'Vidange moteur',
      status: 'open',
    }).create()

    const service = await app.container.make(BoatMaintenanceTaskService)
    await service.markDone(admin, boat, task.id, {})

    assert.deepEqual(await typesOf(owner), ['owner.maintenance_done'])
    assert.deepEqual(await typesOf(stranger), [])
    const notification = await Notification.query().where('userId', owner.id).firstOrFail()
    assert.equal(notification.actionUrl, `/owner/boats/${boat.id}`)
    assert.include(notification.body!, 'Vidange moteur')
  })

  test('a reported incident reaches the owner, translated', async ({ assert }) => {
    const { admin, owner, stranger, boat } = await setup()

    const service = await app.container.make(BoatIncidentService)
    await service.createForBoat(admin, boat, {
      occurredAt: '2026-10-01T09:00',
      tzOffsetMinutes: 0,
      type: 'flooding',
      description: "Voie d'eau au presse-étoupe",
    })

    assert.deepEqual(await typesOf(owner), ['owner.incident_created'])
    assert.deepEqual(await typesOf(stranger), [])
    const notification = await Notification.query().where('userId', owner.id).firstOrFail()
    assert.equal(notification.severity, 'error')
    assert.include(notification.title, "Voie d'eau")
    // Le détail de l'incident reste interne.
    assert.notInclude(notification.body ?? '', 'presse-étoupe')
  })

  test('an invoice sent to the client bearing the owner e-mail reaches them', async ({
    client,
    assert,
  }) => {
    const { admin, owner, stranger, boat } = await setup()
    const crmClient = await ClientFactory.merge({
      organizationId: admin.organizationId!,
      email: owner.email.toUpperCase(),
    }).create()
    const invoice = await InvoiceFactory.apply('invoice')
      .merge({ organizationId: admin.organizationId!, clientId: crmClient.id, status: 'draft' })
      .create()

    const service = await app.container.make(InvoiceService)
    await service.markSent(invoice, admin.id)
    // Un second envoi (relance manuelle) ne renotifie pas.
    await service.markSent(invoice, admin.id)

    assert.deepEqual(await typesOf(owner), ['owner.invoice_sent'])
    assert.deepEqual(await typesOf(stranger), [])

    const page = await client.get(`/owner/boats/${boat.id}`).loginAs(owner).withInertia()
    const { invoices } = page.inertiaProps as { invoices: { id: number }[] }
    assert.deepEqual(
      invoices.map((row) => row.id),
      [invoice.id]
    )
  })

  test('an invoice to an ordinary client notifies no owner', async ({ assert }) => {
    const { admin, owner } = await setup()
    const crmClient = await ClientFactory.merge({ organizationId: admin.organizationId! }).create()
    const invoice = await InvoiceFactory.apply('invoice')
      .merge({ organizationId: admin.organizationId!, clientId: crmClient.id, status: 'draft' })
      .create()

    const service = await app.container.make(InvoiceService)
    await service.markSent(invoice, admin.id)

    assert.deepEqual(await typesOf(owner), [])
  })

  test('the daily scan warns the owner of an expiring document', async ({ assert }) => {
    const { owner, stranger, boat } = await setup()
    await BoatDocumentFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      expiresAt: DateTime.now().plus({ days: 10 }),
    }).create()

    const scan = new NotificationScanService(await app.container.make(NotificationService))
    await scan.run()
    // Anti-doublon : un second passage le même jour ne renotifie pas.
    await scan.run()

    assert.deepEqual(await typesOf(owner), ['owner.document_expiring'])
    assert.deepEqual(await typesOf(stranger), [])
    const notification = await Notification.query().where('userId', owner.id).firstOrFail()
    assert.equal(notification.actionUrl, `/owner/boats/${boat.id}`)
  })
})
