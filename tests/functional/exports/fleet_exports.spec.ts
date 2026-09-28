import { test } from '@japa/runner'
import AuditLog from '#models/audit_log'
import BoatReservation from '#models/boat_reservation'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatMaintenanceEventFactory } from '#database/factories/boat_maintenance_event_factory'
import { truncateDb } from '#tests/utils/db'
import {
  createAdminUser,
  createBoatOwnerUser,
  createEnterpriseAdminUser,
  createMechanicUser,
} from '#tests/functional/helpers'
import { createClient, csvRows } from '#tests/functional/exports/helpers'
import { DateTime } from 'luxon'

/**
 * Exports flotte (#879) : réservations, clients, historique de maintenance,
 * et période sur les exports par bateau.
 */

async function frenchAdmin() {
  const user = await createEnterpriseAdminUser()
  user.locale = 'fr'
  await user.save()
  return user
}

async function reservation(
  organizationId: number,
  boatId: number,
  startsAt: string,
  endsAt: string,
  overrides: Partial<{ clientName: string; status: 'option' | 'confirmed' | 'cancelled' }> = {}
) {
  return BoatReservation.create({
    organizationId,
    boatId,
    status: overrides.status ?? 'confirmed',
    startsAt: DateTime.fromISO(startsAt),
    endsAt: DateTime.fromISO(endsAt),
    clientName: overrides.clientName ?? 'Alice Martin',
    clientEmail: 'alice@example.com',
    totalPrice: '1500.00',
  })
}

test.group('Exports flotte — réservations', (group) => {
  group.each.setup(() => truncateDb())

  test('reservations overlapping the period, with their payment columns', async ({
    client,
    assert,
  }) => {
    const user = await frenchAdmin()
    const orgId = user.organizationId!
    const boat = await BoatFactory.merge({ organizationId: orgId, name: 'Ondine' }).create()
    await reservation(orgId, boat.id, '2026-05-28T10:00', '2026-06-03T18:00', {
      clientName: 'À cheval',
    })
    await reservation(orgId, boat.id, '2026-06-10T10:00', '2026-06-12T18:00', {
      clientName: 'Dedans',
    })
    await reservation(orgId, boat.id, '2026-07-01T10:00', '2026-07-05T18:00', {
      clientName: 'Après',
    })

    const response = await client
      .get('/reservations/export.csv')
      .qs({ from: '2026-06-01', to: '2026-06-30' })
      .loginAs(user)

    response.assertStatus(200)
    assert.include(response.header('content-disposition'), 'reservations_2026-06-01_2026-06-30.csv')
    const rows = csvRows(response.text())
    assert.deepEqual(rows[0].slice(0, 3), ['bateau', 'prestation', 'statut'])
    assert.deepEqual(
      rows.slice(1).map((row) => row[5]),
      ['À cheval', 'Dedans']
    )
    assert.deepEqual(rows[1].slice(0, 3), ['Ondine', '', 'Confirmée'])
    assert.equal(rows[1][8], '1500.00')
    assert.equal(rows[1][11], 'Non réglée')
  })

  test('the status and boat filters apply, other organizations never leak', async ({
    client,
    assert,
  }) => {
    const user = await frenchAdmin()
    const orgId = user.organizationId!
    const boatA = await BoatFactory.merge({ organizationId: orgId }).create()
    const boatB = await BoatFactory.merge({ organizationId: orgId }).create()
    await reservation(orgId, boatA.id, '2026-06-10', '2026-06-12', { clientName: 'A-confirmée' })
    await reservation(orgId, boatA.id, '2026-06-10', '2026-06-12', {
      clientName: 'A-option',
      status: 'option',
    })
    await reservation(orgId, boatB.id, '2026-06-10', '2026-06-12', { clientName: 'B' })
    const other = await createEnterpriseAdminUser()
    const foreignBoat = await BoatFactory.merge({ organizationId: other.organizationId! }).create()
    await reservation(other.organizationId!, foreignBoat.id, '2026-06-10', '2026-06-12', {
      clientName: 'Étranger',
    })

    const response = await client
      .get('/reservations/export.csv')
      .qs({ boatId: boatA.id, status: 'confirmed' })
      .loginAs(user)
    assert.deepEqual(
      csvRows(response.text())
        .slice(1)
        .map((row) => row[5]),
      ['A-confirmée']
    )

    const all = await client.get('/reservations/export.csv').loginAs(user)
    assert.notInclude(all.text(), 'Étranger')
  })

  test('without the rental module, the export is closed', async ({ client }) => {
    const user = await createAdminUser('pro')
    const response = await client.get('/reservations/export.csv').loginAs(user).redirects(0)
    response.assertStatus(302)
  })

  test('a boat owner is sent back to the owner portal', async ({ client }) => {
    const admin = await createEnterpriseAdminUser()
    const owner = await createBoatOwnerUser(admin.organizationId!)
    const response = await client.get('/reservations/export.csv').loginAs(owner).redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/owner/boats')
  })
})

test.group('Exports flotte — clients', (group) => {
  group.each.setup(() => truncateDb())

  test('client records without the anonymized ones, logged as a bulk export', async ({
    client,
    assert,
  }) => {
    const user = await frenchAdmin()
    const orgId = user.organizationId!
    await createClient(orgId, { firstName: 'Alice', lastName: 'Martin' })
    await createClient(orgId, {
      firstName: 'Zoé',
      lastName: 'Anonyme',
      anonymizedAt: DateTime.now(),
    })

    const response = await client.get('/clients/export.csv').loginAs(user)

    response.assertStatus(200)
    const rows = csvRows(response.text())
    assert.deepEqual(rows[0].slice(0, 3), ['nom', 'prénom', 'email'])
    assert.lengthOf(rows, 2)
    assert.deepEqual(rows[1].slice(0, 3), ['Martin', 'Alice', 'alice@example.com'])
    assert.equal(rows[1][7], 'Actif')

    const bulk = await AuditLog.query().where('action', 'client.export_bulk').firstOrFail()
    assert.equal(bulk.userId, user.id)
    assert.equal(bulk.metadata!.rowCount, 1)
    assert.lengthOf(await AuditLog.query().where('action', 'export.run'), 1)
  })

  test('the period filters on the creation date', async ({ client, assert }) => {
    const user = await frenchAdmin()
    const old = await createClient(user.organizationId!, { lastName: 'Ancien' })
    old.createdAt = DateTime.fromISO('2025-01-10T10:00:00')
    await old.save()
    await createClient(user.organizationId!, { lastName: 'Récent' })

    const today = DateTime.now().toISODate()!
    const response = await client
      .get('/clients/export.csv')
      .qs({ from: '2026-01-01', to: today })
      .loginAs(user)
    assert.deepEqual(
      csvRows(response.text())
        .slice(1)
        .map((row) => row[0]),
      ['Récent']
    )
  })

  test('a mechanic cannot export client records', async ({ client }) => {
    const admin = await createEnterpriseAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)
    const response = await client
      .get('/clients/export.csv')
      .header('Accept', 'application/json')
      .loginAs(mechanic)
    response.assertStatus(403)
  })

  test('without the CRM module and without clients, the export is closed', async ({ client }) => {
    const user = await createAdminUser('pro')
    const response = await client.get('/clients/export.csv').loginAs(user).redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/settings/billing')
  })
})

test.group('Exports flotte — historique de maintenance', (group) => {
  group.each.setup(() => truncateDb())

  test('the whole fleet, with the screen filters', async ({ client, assert }) => {
    const user = await frenchAdmin()
    const orgId = user.organizationId!
    const ondine = await BoatFactory.merge({ organizationId: orgId, name: 'Ondine' }).create()
    const zephyr = await BoatFactory.merge({ organizationId: orgId, name: 'Zéphyr' }).create()
    await BoatMaintenanceEventFactory.merge({
      boatId: ondine.id,
      title: 'Vidange',
      subject: 'engine',
      performedAt: DateTime.fromISO('2026-04-02'),
    }).create()
    await BoatMaintenanceEventFactory.merge({
      boatId: zephyr.id,
      title: 'Carénage',
      subject: 'hull',
      performedAt: DateTime.fromISO('2026-05-10'),
    }).create()
    await BoatMaintenanceEventFactory.merge({
      boatId: zephyr.id,
      title: 'Ancien',
      subject: 'hull',
      performedAt: DateTime.fromISO('2025-05-10'),
    }).create()

    const response = await client
      .get('/maintenance/history.csv')
      .qs({ dateFrom: '2026-01-01', dateTo: '2026-12-31' })
      .loginAs(user)

    response.assertStatus(200)
    const rows = csvRows(response.text())
    assert.deepEqual(rows[0].slice(0, 3), ['date', 'bateau', 'titre'])
    assert.deepEqual(
      rows.slice(1).map((row) => row.slice(0, 3)),
      [
        ['2026-04-02', 'Ondine', 'Vidange'],
        ['2026-05-10', 'Zéphyr', 'Carénage'],
      ]
    )

    const hull = await client
      .get('/maintenance/history.csv')
      .qs({ subject: 'hull', boatId: zephyr.id })
      .loginAs(user)
    assert.deepEqual(
      csvRows(hull.text())
        .slice(1)
        .map((row) => row[2]),
      ['Ancien', 'Carénage']
    )
  })

  test('a plan without export is sent to the upsell', async ({ client }) => {
    const user = await createAdminUser('starter')
    const response = await client.get('/maintenance/history.csv').loginAs(user).redirects(0)
    response.assertStatus(302)
    response.assertFlashMessage('errorAction', '/settings/billing')
  })
})

test.group('Exports par bateau — période', (group) => {
  group.each.setup(() => truncateDb())

  test('from/to narrow the maintenance export of a boat', async ({ client, assert }) => {
    const user = await frenchAdmin()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    for (const [title, date] of [
      ['Hiver', '2026-01-15'],
      ['Printemps', '2026-04-15'],
      ['Été', '2026-07-15'],
    ]) {
      await BoatMaintenanceEventFactory.merge({
        boatId: boat.id,
        title,
        performedAt: DateTime.fromISO(date),
      }).create()
    }

    const response = await client
      .get(`/boats/${boat.id}/export/maintenance.csv`)
      .qs({ from: '2026-04-01', to: '2026-04-30' })
      .loginAs(user)

    response.assertStatus(200)
    assert.deepEqual(
      csvRows(response.text())
        .slice(1)
        .map((row) => row[1]),
      ['Printemps']
    )
  })

  test('an invalid date is refused', async ({ client }) => {
    const user = await frenchAdmin()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const response = await client
      .get(`/boats/${boat.id}/export/fuel-logs.csv`)
      .qs({ from: '2026-13-45' })
      .header('Accept', 'application/json')
      .loginAs(user)
    response.assertStatus(422)
  })
})
