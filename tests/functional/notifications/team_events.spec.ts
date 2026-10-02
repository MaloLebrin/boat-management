import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { InvoiceFactory } from '#database/factories/invoice_factory'
import { MediaFactory } from '#database/factories/media_factory'
import Notification from '#models/notification'
import OrganizationMembership from '#models/organization_membership'
import type User from '#models/user'
import BoatIncidentService from '#services/boat_incident_service'
import BoatReservationService from '#services/boat_reservation_service'
import InvoiceService from '#services/invoice_service'
import NotificationScanService from '#services/notification_scan_service'
import NotificationService from '#services/notification_service'
import { truncateDb } from '#tests/utils/db'
import {
  createAdminUser,
  createCharterAdminUser,
  createMechanicUser,
  createMemberUser,
} from '#tests/functional/helpers'

/**
 * Nouveaux types émis depuis leur événement (#888) : réservation créée,
 * confirmée, annulée, départ du lendemain ; incident déclaré, clôturé ;
 * facture réglée. Toute l'équipe est visée, l'auteur exclu, et les défauts du
 * rôle trient : le mécanicien n'a rien de la location, le membre rien de la
 * facturation.
 */

async function team(admin: User) {
  const member = await createMemberUser(admin.organizationId!)
  const mechanic = await createMechanicUser(admin.organizationId!)
  return { member, mechanic }
}

async function visibleTypes(user: User): Promise<string[]> {
  const rows = await Notification.query()
    .where('userId', user.id)
    .where('inApp', true)
    .orderBy('id', 'asc')
  return rows.map((row) => row.type)
}

test.group('Team notifications (#888)', () => {
  test('a booking created then confirmed notifies the team, not its author', async ({ assert }) => {
    const admin = await createCharterAdminUser()
    const { member, mechanic } = await team(admin)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const service = await app.container.make(BoatReservationService)

    const { reservation } = await service.create(admin, boat, {
      startsAt: '2027-05-01T10:00',
      endsAt: '2027-05-03T10:00',
      tzOffsetMinutes: 0,
      clientName: 'Jeanne Martin',
    })
    await service.update(admin, boat, reservation.id, { status: 'confirmed' })

    assert.deepEqual(await visibleTypes(member), ['reservation.created', 'reservation.confirmed'])
    assert.deepEqual(await visibleTypes(mechanic), [])
    assert.deepEqual(await visibleTypes(admin), [])
    const created = await Notification.query()
      .where('userId', member.id)
      .where('type', 'reservation.created')
      .firstOrFail()
    assert.equal(created.actionUrl, `/boats/${boat.id}/reservations`)
    assert.include(created.body!, 'Jeanne Martin')
  })

  test('an incident reported then closed reaches everyone on the team', async ({ assert }) => {
    const admin = await createAdminUser()
    const { member, mechanic } = await team(admin)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const service = await app.container.make(BoatIncidentService)

    const incident = await service.createForBoat(mechanic, boat, {
      occurredAt: '2026-10-01T09:00',
      tzOffsetMinutes: 0,
      type: 'flooding',
      description: "Voie d'eau au presse-étoupe",
    })

    assert.deepEqual(await visibleTypes(admin), ['incident.created'])
    assert.deepEqual(await visibleTypes(member), ['incident.created'])
    assert.deepEqual(await visibleTypes(mechanic), [])
    const notification = await Notification.query().where('userId', admin.id).firstOrFail()
    assert.equal(notification.severity, 'error')
    assert.equal(notification.actionUrl, `/boats/${boat.id}/incidents/${incident.id}`)

    // Clôture : une photo est exigée (#814). Une mise à jour sans changement
    // d'état ne notifie personne.
    await service.updateForBoat(admin, boat, incident.id, { status: 'in_progress' })
    await MediaFactory.merge({
      organizationId: admin.organizationId!,
      entityType: 'boat_incident',
      entityId: incident.id,
      kind: 'photo',
    }).create()
    await service.updateForBoat(admin, boat, incident.id, { status: 'closed' })
    await service.updateForBoat(admin, boat, incident.id, { location: 'Port de Brest' })

    assert.deepEqual(await visibleTypes(member), ['incident.created', 'incident.resolved'])
    assert.deepEqual(await visibleTypes(mechanic), ['incident.resolved'])
    assert.deepEqual(await visibleTypes(admin), ['incident.created'])
  })

  test('an invoice marked paid notifies the other admins only', async ({ assert }) => {
    const admin = await createAdminUser()
    const otherAdmin = await createAdminUser()
    // Second admin de la même organisation.
    otherAdmin.organizationId = admin.organizationId
    await otherAdmin.save()
    await OrganizationMembership.create({
      userId: otherAdmin.id,
      organizationId: admin.organizationId!,
      role: 'admin',
    })
    const { member } = await team(admin)
    const invoice = await InvoiceFactory.apply('invoice')
      .apply('sent')
      .merge({ organizationId: admin.organizationId! })
      .create()

    const service = await app.container.make(InvoiceService)
    await service.markAsPaid(invoice, undefined, admin.id)

    assert.deepEqual(await visibleTypes(otherAdmin), ['invoice.paid'])
    assert.deepEqual(await visibleTypes(admin), [])
    assert.deepEqual(await visibleTypes(member), [])
  })
})

test.group('Departure tomorrow scan (#888)', (group) => {
  group.each.setup(() => truncateDb())

  test('notifies the admins once per boat about tomorrow departures', async ({ assert }) => {
    const admin = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const tomorrow = DateTime.now().setZone('Europe/Paris').plus({ days: 1 }).set({ hour: 10 })
    await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'confirmed',
      startsAt: tomorrow,
      endsAt: tomorrow.plus({ days: 2 }),
      paymentStatus: 'paid',
    }).create()
    // Une option ne part pas.
    await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'option',
      startsAt: tomorrow.plus({ hours: 3 }),
      endsAt: tomorrow.plus({ days: 1 }),
    }).create()

    const scan = () => new NotificationScanService(new NotificationService()).run()
    await scan()
    await scan()

    const notifications = await Notification.query()
      .where('userId', admin.id)
      .where('type', 'reservation.starts_tomorrow')
    assert.lengthOf(notifications, 1)
    assert.equal(notifications[0].metadata?.count, 1)
    assert.equal(notifications[0].actionUrl, `/boats/${boat.id}/reservations`)
  })
})
