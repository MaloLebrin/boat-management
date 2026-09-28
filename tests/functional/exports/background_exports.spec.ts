import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import app from '@adonisjs/core/services/app'
import AuditLog from '#models/audit_log'
import DataExport from '#models/data_export'
import Notification from '#models/notification'
import type User from '#models/user'
import PurgeExpiredExports from '#jobs/purge_expired_exports'
import FleetExportService from '#services/fleet_export_service'
import DataExportService from '#services/data_export_service'
import { EXPORT_ASYNC_THRESHOLD } from '#shared/constants/exports'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser, createEnterpriseAdminUser } from '#tests/functional/helpers'
import { createInvoice, csvRows } from '#tests/functional/exports/helpers'
import { DateTime } from 'luxon'

/**
 * Exports générés en arrière-plan (#879) : au-delà du seuil, `GenerateExport`
 * produit le fichier (queue `sync` en test : il tourne pendant la requête),
 * le garde en base, notifie le demandeur ; `/settings/exports` le liste avec
 * un lien signé ; `PurgeExpiredExports` le supprime à expiration.
 */

/** Le seuil est franchi sans créer 5 000 lignes : seul le comptage est truqué. */
class OverThresholdExportService extends FleetExportService {
  override async count() {
    return EXPORT_ASYNC_THRESHOLD + 1
  }
}

async function frenchAdmin() {
  const user = await createEnterpriseAdminUser()
  user.locale = 'fr'
  await user.save()
  return user
}

async function queueInvoicesExport(client: ApiClient, user: User) {
  return client
    .get('/invoices/export.csv')
    .qs({ from: '2026-01-01', to: '2026-12-31' })
    .header('referer', '/invoices')
    .loginAs(user)
    .redirects(0)
}

test.group('Exports en arrière-plan', (group) => {
  group.each.setup(() => truncateDb())
  group.each.setup(async () => {
    const fleetExportService = await app.container.make(OverThresholdExportService)
    app.container.swap(FleetExportService, () => fleetExportService)
    return () => app.container.restore(FleetExportService)
  })

  test('over the threshold, the export is generated in the background and notified', async ({
    client,
    assert,
  }) => {
    const user = await frenchAdmin()
    await createInvoice(user.organizationId!)

    const response = await queueInvoicesExport(client, user)

    response.assertStatus(302)
    response.assertHeader('location', '/invoices')
    response.assertFlashMessage(
      'success',
      "Export volumineux : il est en cours de génération. Vous recevrez une notification dès qu'il sera prêt, et le retrouverez dans Paramètres → Exports."
    )

    const dataExport = await DataExport.findByOrFail('userId', user.id)
    assert.equal(dataExport.status, 'ready')
    assert.equal(dataExport.type, 'invoices')
    assert.equal(dataExport.rowCount, 1)
    assert.deepInclude(dataExport.params, { from: '2026-01-01', to: '2026-12-31' })
    assert.isTrue(dataExport.expiresAt > DateTime.now().plus({ days: 6 }))

    const notification = await Notification.findByOrFail('type', 'export.ready')
    assert.equal(notification.userId, user.id)
    assert.equal(notification.actionUrl, '/settings/exports')
    assert.equal(notification.title, 'Export prêt : Journal des ventes')

    const audit = await AuditLog.query().where('action', 'export.run').firstOrFail()
    assert.deepInclude(audit.metadata!, { type: 'invoices', rowCount: 1, async: true })
  })

  test('the settings page lists it with a signed link that serves the file', async ({
    client,
    assert,
  }) => {
    const user = await frenchAdmin()
    await createInvoice(user.organizationId!, { number: 'FAC-000042' })
    await queueInvoicesExport(client, user)

    const page = await client.get('/settings/exports').loginAs(user).withInertia()
    page.assertStatus(200)
    const rows = page.inertiaProps.exports as Array<Record<string, unknown>>
    assert.lengthOf(rows, 1)
    assert.equal(rows[0].status, 'ready')
    assert.deepEqual(rows[0].period, { from: '2026-01-01', to: '2026-12-31' })
    const downloadUrl = rows[0].downloadUrl as string
    assert.match(downloadUrl, /^\/exports\/\d+\/download\?signature=/)

    const download = await client.get(downloadUrl).loginAs(user)
    download.assertStatus(200)
    assert.include(
      download.header('content-disposition'),
      'sales-journal_2026-01-01_2026-12-31.csv'
    )
    assert.equal(csvRows(download.text())[1][0], 'FAC-000042')
  })

  test('the link needs its signature, and the requester', async ({ client, assert }) => {
    const user = await frenchAdmin()
    await queueInvoicesExport(client, user)
    const dataExport = await DataExport.findByOrFail('userId', user.id)
    const service = await app.container.make(DataExportService)
    const signed = service.signedDownloadUrl(dataExport)

    const unsigned = await client.get(`/exports/${dataExport.id}/download`).loginAs(user)
    unsigned.assertStatus(404)

    const tampered = await client
      .get(signed.replace(/signature=.{4}/, 'signature=XXXX'))
      .loginAs(user)
    tampered.assertStatus(404)

    // Même organisation, autre utilisateur : le lien ne suffit pas.
    const colleague = await createAdminUser('enterprise')
    const stolen = await client.get(signed).loginAs(colleague)
    stolen.assertStatus(404)

    const anonymous = await client.get(signed).redirects(0)
    anonymous.assertStatus(302)
    assert.match(anonymous.header('location') ?? '', /^\/login/)
    const untouched = await DataExport.findOrFail(dataExport.id)
    assert.equal(untouched.status, 'ready')
  })

  test('an expired export is neither listed with a link nor served, then purged', async ({
    client,
    assert,
  }) => {
    const user = await frenchAdmin()
    await queueInvoicesExport(client, user)
    const dataExport = await DataExport.findByOrFail('userId', user.id)
    const service = await app.container.make(DataExportService)
    const signed = service.signedDownloadUrl(dataExport)
    dataExport.expiresAt = DateTime.now().minus({ minutes: 1 })
    await dataExport.save()

    const page = await client.get('/settings/exports').loginAs(user).withInertia()
    const rows = page.inertiaProps.exports as Array<Record<string, unknown>>
    assert.isNull(rows[0].downloadUrl)
    const download = await client.get(signed).loginAs(user)
    download.assertStatus(404)

    const job = await app.container.make(PurgeExpiredExports)
    await job.execute()
    assert.isNull(await DataExport.find(dataExport.id))
  })

  test('the purge keeps the exports that have not expired', async ({ client, assert }) => {
    const user = await frenchAdmin()
    await queueInvoicesExport(client, user)

    const job = await app.container.make(PurgeExpiredExports)
    await job.execute()
    assert.lengthOf(await DataExport.all(), 1)
  })

  test('a failed generation is kept as failed and notified', async ({ client, assert }) => {
    class FailingExportService extends OverThresholdExportService {
      override async build(): Promise<never> {
        throw new Error('boom')
      }
    }
    const failing = await app.container.make(FailingExportService)
    app.container.swap(FleetExportService, () => failing)

    const user = await frenchAdmin()
    await queueInvoicesExport(client, user)

    const dataExport = await DataExport.findByOrFail('userId', user.id)
    assert.equal(dataExport.status, 'failed')
    assert.equal(dataExport.error, 'boom')
    const notification = await Notification.findByOrFail('type', 'export.failed')
    assert.equal(notification.userId, user.id)
  })
})

test.group('Page des exports', (group) => {
  group.each.setup(() => truncateDb())

  test('a plan without export is sent to the billing page', async ({ client }) => {
    const user = await createAdminUser('starter')
    const response = await client.get('/settings/exports').loginAs(user).redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/settings/billing')
  })

  test('each user only sees their own exports', async ({ client, assert }) => {
    const user = await frenchAdmin()
    const colleague = await createAdminUser('enterprise')
    colleague.organizationId = user.organizationId
    await colleague.save()
    await DataExport.create({
      organizationId: user.organizationId!,
      userId: colleague.id,
      type: 'clients',
      params: { from: null, to: null },
      status: 'pending',
      expiresAt: DateTime.now().plus({ days: 7 }),
    })

    const page = await client.get('/settings/exports').loginAs(user).withInertia()
    assert.lengthOf(page.inertiaProps.exports as unknown[], 0)
  })
})
