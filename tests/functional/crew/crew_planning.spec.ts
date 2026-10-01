import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { truncateDb } from '#tests/utils/db'
import BoatReservationCrewMember from '#models/boat_reservation_crew_member'
import CrewCertification from '#models/crew_certification'
import CrewUnavailability from '#models/crew_unavailability'
import NavigationLog from '#models/navigation_log'
import Notification from '#models/notification'
import CrewPlanningService from '#services/crew_planning_service'
import NotificationService from '#services/notification_service'
import NavigationLogService from '#services/navigation_log_service'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { CrewMemberFactory } from '#database/factories/crew_member_factory'
import {
  createAdminUser,
  createCharterAdminUser,
  createMechanicUser,
} from '#tests/functional/helpers'
import { assertPageContract } from '#tests/support/inertia_page'
import type Boat from '#models/boat'
import type User from '#models/user'
import type { ApiClient } from '@japa/api-client'

/**
 * Planning d'équipage (#883) : affectation d'équipiers aux réservations,
 * refus des chevauchements et des indisponibilités, cloisonnement entre
 * organisations, garde du module Location et propagations (journal de bord,
 * rappel J-1).
 */

async function reservationIn(boat: Boat, days: number, nights = 2, overrides = {}) {
  const startsAt = DateTime.now().plus({ days }).set({ hour: 10, minute: 0, second: 0 })
  return await BoatReservationFactory.merge({
    boatId: boat.id,
    organizationId: boat.organizationId,
    status: 'confirmed',
    startsAt,
    endsAt: startsAt.plus({ days: nights }),
    clientName: 'Alice Martin',
    ...overrides,
  }).create()
}

async function memberOf(user: User, overrides = {}) {
  return await CrewMemberFactory.merge({
    organizationId: user.organizationId!,
    ...overrides,
  }).create()
}

function assign(
  client: ApiClient,
  user: User,
  boatId: number,
  reservationId: number,
  form: Record<string, unknown>
) {
  return client
    .post(`/boats/${boatId}/reservations/${reservationId}/crew`)
    .form(form)
    .loginAs(user)
    .redirects(0)
}

test.group('Planning d’équipage — affectation', (group) => {
  group.each.setup(() => truncateDb())

  test('affecte un skipper et le rend sur le bloc Équipage', async ({ client, assert }) => {
    const admin = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const reservation = await reservationIn(boat, 10, 2, { type: 'skippered' })
    const skipper = await memberOf(admin, { firstName: 'Yann', lastName: 'Le Gall' })

    const response = await assign(client, admin, boat.id, reservation.id, {
      crewMemberId: skipper.id,
      role: 'skipper',
    })
    response.assertStatus(302)
    response.assertFlashMessage('success')

    const page = await client
      .get(`/boats/${boat.id}/reservations/${reservation.id}/crew`)
      .loginAs(admin)
      .withInertia()
    assertPageContract(assert, page, 'boats/reservation_crew')
    const props = page.inertiaProps as {
      crew: Array<{ fullName: string; role: string }>
      availability: Array<{ id: number }>
    }
    assert.deepEqual(
      props.crew.map((c) => [c.fullName, c.role]),
      [['Yann Le Gall', 'skipper']]
    )
    assert.notInclude(
      props.availability.map((a) => a.id),
      skipper.id
    )
  })

  test('refuse un équipier déjà embarqué sur une réservation qui se chevauche', async ({
    client,
    assert,
  }) => {
    const admin = await createCharterAdminUser()
    const boatA = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const boatB = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const first = await reservationIn(boatA, 10, 3)
    const overlapping = await reservationIn(boatB, 11, 3)
    const after = await reservationIn(boatB, 13, 2)
    const member = await memberOf(admin)

    await assign(client, admin, boatA.id, first.id, { crewMemberId: member.id, role: 'crew' })
    const refused = await assign(client, admin, boatB.id, overlapping.id, {
      crewMemberId: member.id,
      role: 'crew',
    })
    refused.assertFlashMessage('error')

    // Le départ du lendemain du retour ne recoupe rien (fin exclue).
    const ok = await assign(client, admin, boatB.id, after.id, {
      crewMemberId: member.id,
      role: 'crew',
    })
    ok.assertFlashMessage('success')

    const rows = await BoatReservationCrewMember.query().where('crewMemberId', member.id)
    assert.sameMembers(
      rows.map((r) => r.reservationId),
      [first.id, after.id]
    )
  })

  test('une réservation annulée ne bloque pas, et n’embarque plus personne', async ({
    client,
    assert,
  }) => {
    const admin = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const cancelled = await reservationIn(boat, 10, 3, { status: 'cancelled' })
    const other = await reservationIn(boat, 11, 1, { status: 'option' })
    const member = await memberOf(admin)
    await BoatReservationCrewMember.create({
      reservationId: cancelled.id,
      crewMemberId: member.id,
      role: 'crew',
      notes: null,
    })

    const ok = await assign(client, admin, boat.id, other.id, {
      crewMemberId: member.id,
      role: 'crew',
    })
    ok.assertFlashMessage('success')

    const second = await memberOf(admin)
    const refused = await assign(client, admin, boat.id, cancelled.id, {
      crewMemberId: second.id,
      role: 'crew',
    })
    refused.assertFlashMessage('error')
    assert.lengthOf(await BoatReservationCrewMember.query().where('crewMemberId', second.id), 0)
  })

  test('refuse un équipier indisponible sur ces dates', async ({ client, assert }) => {
    const admin = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const reservation = await reservationIn(boat, 10, 2)
    const member = await memberOf(admin)

    const leave = await client
      .post(`/crew/${member.id}/unavailabilities`)
      .form({
        startsOn: reservation.startsAt.plus({ days: 1 }).toISODate(),
        endsOn: reservation.startsAt.plus({ days: 5 }).toISODate(),
        reason: 'Congés',
      })
      .loginAs(admin)
      .redirects(0)
    leave.assertFlashMessage('success')

    const refused = await assign(client, admin, boat.id, reservation.id, {
      crewMemberId: member.id,
      role: 'crew',
    })
    refused.assertFlashMessage('error')
    assert.lengthOf(await BoatReservationCrewMember.all(), 0)

    const page = await client
      .get(`/boats/${boat.id}/reservations/${reservation.id}/crew`)
      .loginAs(admin)
      .withInertia()
    const props = page.inertiaProps as {
      availability: Array<{ id: number; available: boolean; conflicts: Array<{ kind: string }> }>
    }
    const row = props.availability.find((a) => a.id === member.id)!
    assert.isFalse(row.available)
    assert.equal(row.conflicts[0].kind, 'unavailability')
  })

  test('une certification qui expire avant la fin avertit sans bloquer', async ({
    client,
    assert,
  }) => {
    const admin = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const reservation = await reservationIn(boat, 10, 4)
    const member = await memberOf(admin)
    await CrewCertification.create({
      crewMemberId: member.id,
      type: 'medical_certificate',
      referenceNumber: null,
      expiresAt: DateTime.now().plus({ days: 11 }),
    })

    const response = await assign(client, admin, boat.id, reservation.id, {
      crewMemberId: member.id,
      role: 'skipper',
    })
    response.assertFlashMessage('info')
    assert.lengthOf(await BoatReservationCrewMember.all(), 1)
  })

  test('retire un équipier de la réservation', async ({ client, assert }) => {
    const admin = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const reservation = await reservationIn(boat, 10)
    const member = await memberOf(admin)
    const assignment = await BoatReservationCrewMember.create({
      reservationId: reservation.id,
      crewMemberId: member.id,
      role: 'crew',
      notes: null,
    })

    const response = await client
      .delete(`/boats/${boat.id}/reservations/${reservation.id}/crew/${assignment.id}`)
      .loginAs(admin)
      .redirects(0)
    response.assertFlashMessage('success')
    assert.lengthOf(await BoatReservationCrewMember.all(), 0)
  })
})

test.group('Planning d’équipage — cloisonnement et droits', (group) => {
  group.each.setup(() => truncateDb())

  test('un équipier d’une autre organisation n’est jamais affecté', async ({ client, assert }) => {
    const admin = await createCharterAdminUser()
    const outsider = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const reservation = await reservationIn(boat, 10)
    const foreign = await memberOf(outsider)

    const response = await assign(client, admin, boat.id, reservation.id, {
      crewMemberId: foreign.id,
      role: 'crew',
    })
    response.assertFlashMessage('error')
    assert.lengthOf(await BoatReservationCrewMember.all(), 0)
  })

  test('la réservation d’une autre organisation reste fermée', async ({ client, assert }) => {
    const admin = await createCharterAdminUser()
    const outsider = await createCharterAdminUser()
    const foreignBoat = await BoatFactory.merge({
      organizationId: outsider.organizationId!,
    }).create()
    const foreignReservation = await reservationIn(foreignBoat, 10)
    const member = await memberOf(admin)

    const response = await assign(client, admin, foreignBoat.id, foreignReservation.id, {
      crewMemberId: member.id,
      role: 'crew',
    })
    response.assertStatus(302)
    response.assertHeader('location', '/boats')
    assert.lengthOf(await BoatReservationCrewMember.all(), 0)
  })

  test('un mécanicien, sans droit de gérer le bateau, ne peut pas affecter', async ({
    client,
    assert,
  }) => {
    const admin = await createCharterAdminUser()
    const member = await createMechanicUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const reservation = await reservationIn(boat, 10)
    const crew = await memberOf(admin)

    const response = await client
      .post(`/boats/${boat.id}/reservations/${reservation.id}/crew`)
      .form({ crewMemberId: crew.id, role: 'crew' })
      .loginAs(member)
      .redirects(0)
    assert.notEqual(response.status(), 200)
    assert.lengthOf(await BoatReservationCrewMember.all(), 0)
  })

  test('sans module Location, le calendrier renvoie vers la facturation', async ({ client }) => {
    const admin = await createAdminUser()
    const response = await client.get('/crew/planning').loginAs(admin).redirects(0)
    response.assertStatus(302)
    response.assertFlashMessage('error')
  })

  test('une indisponibilité d’un autre équipage ne se supprime pas', async ({ client, assert }) => {
    const admin = await createCharterAdminUser()
    const outsider = await createCharterAdminUser()
    const foreign = await memberOf(outsider)
    const leave = await CrewUnavailability.create({
      crewMemberId: foreign.id,
      startsOn: DateTime.now(),
      endsOn: DateTime.now().plus({ days: 2 }),
      reason: null,
    })

    const response = await client
      .delete(`/crew/${foreign.id}/unavailabilities/${leave.id}`)
      .loginAs(admin)
      .redirects(0)
    response.assertFlashMessage('error')
    assert.isNotNull(await CrewUnavailability.find(leave.id))
  })
})

test.group('Planning d’équipage — écrans', (group) => {
  group.each.setup(() => truncateDb())

  test('le calendrier montre embarquements et indisponibilités', async ({ client, assert }) => {
    const admin = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const reservation = await reservationIn(boat, 1, 2)
    const member = await memberOf(admin)
    await BoatReservationCrewMember.create({
      reservationId: reservation.id,
      crewMemberId: member.id,
      role: 'skipper',
      notes: null,
    })
    await CrewUnavailability.create({
      crewMemberId: member.id,
      startsOn: DateTime.now().plus({ days: 5 }),
      endsOn: DateTime.now().plus({ days: 6 }),
      reason: 'Congés',
    })

    const page = await client.get('/crew/planning').loginAs(admin).withInertia()
    assertPageContract(assert, page, 'organization/crew_planning')
    const { planning } = page.inertiaProps as {
      planning: { rows: Array<{ crewMemberId: number; entries: Array<{ kind: string }> }> }
    }
    const row = planning.rows.find((r) => r.crewMemberId === member.id)!
    assert.sameMembers(
      row.entries.map((e) => e.kind),
      ['reservation', 'unavailability']
    )
  })

  test('la fiche équipier liste ses embarquements', async ({ client, assert }) => {
    const admin = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const reservation = await reservationIn(boat, 3)
    const member = await memberOf(admin)
    await BoatReservationCrewMember.create({
      reservationId: reservation.id,
      crewMemberId: member.id,
      role: 'instructor',
      notes: null,
    })

    const page = await client.get(`/crew/${member.id}`).loginAs(admin).withInertia()
    assertPageContract(assert, page, 'organization/crew_member')
    const props = page.inertiaProps as {
      history: Array<{ kind: string; role: string }>
      planningEnabled: boolean
    }
    assert.isTrue(props.planningEnabled)
    assert.deepEqual(
      props.history.map((h) => [h.kind, h.role]),
      [['reservation', 'instructor']]
    )
  })

  test('le rôle d’équipage PDF se télécharge depuis la réservation', async ({ client }) => {
    const admin = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const reservation = await reservationIn(boat, 3)
    const member = await memberOf(admin)
    await BoatReservationCrewMember.create({
      reservationId: reservation.id,
      crewMemberId: member.id,
      role: 'skipper',
      notes: null,
    })

    const response = await client
      .get(`/boats/${boat.id}/reservations/${reservation.id}/crew/pdf`)
      .loginAs(admin)
    response.assertStatus(200)
    response.assertHeader('content-type', 'application/pdf')
  })
})

test.group('Planning d’équipage — propagations', (group) => {
  group.each.setup(() => truncateDb())

  test('la sortie du jour J reprend l’équipage de la réservation', async ({ assert }) => {
    const admin = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const startsAt = DateTime.now().startOf('day').plus({ hours: 9 })
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'confirmed',
      startsAt,
      endsAt: startsAt.plus({ days: 1 }),
    }).create()
    const skipper = await memberOf(admin)
    const instructor = await memberOf(admin)
    await BoatReservationCrewMember.createMany([
      { reservationId: reservation.id, crewMemberId: skipper.id, role: 'skipper', notes: null },
      {
        reservationId: reservation.id,
        crewMemberId: instructor.id,
        role: 'instructor',
        notes: null,
      },
    ])

    const log = await new NavigationLogService().createForBoat(boat, {
      departedAt: DateTime.now().set({ hour: 10, minute: 0 }).toFormat("yyyy-LL-dd'T'HH:mm"),
      tzOffsetMinutes: 0,
    })

    const reloaded = await NavigationLog.query().where('id', log.id).preload('crew').firstOrFail()
    const roles = Object.fromEntries(reloaded.crew.map((m) => [m.id, m.$extras.pivot_role]))
    assert.deepEqual(roles, { [skipper.id]: 'skipper', [instructor.id]: 'crew' })
  })

  test('l’équipier qui a un compte est notifié, puis rappelé la veille une seule fois', async ({
    client,
    assert,
  }) => {
    const admin = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const reservation = await reservationIn(boat, 1, 1)
    const member = await memberOf(admin, { email: admin.email.toUpperCase() })

    await assign(client, admin, boat.id, reservation.id, { crewMemberId: member.id, role: 'crew' })
    const assigned = await Notification.query().where('type', 'crew.assigned')
    assert.lengthOf(assigned, 1)
    assert.equal(assigned[0].userId, admin.id)

    const service = new CrewPlanningService(new NotificationService())
    assert.equal(await service.sendDayBeforeReminders(), 1)
    assert.equal(await service.sendDayBeforeReminders(), 0)
    assert.lengthOf(await Notification.query().where('type', 'crew.assignment_reminder'), 1)
  })
})
