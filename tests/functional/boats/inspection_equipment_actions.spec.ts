import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { createAdminUser, createMemberUser } from '#tests/functional/helpers'
import BoatInspection from '#models/boat_inspection'
import BoatEquipmentAction from '#models/boat_equipment_action'
import type Boat from '#models/boat'

async function makeInspection(boat: Boat, kind: 'checkout' | 'checkin' = 'checkout') {
  const reservation = await BoatReservationFactory.merge({
    boatId: boat.id,
    organizationId: boat.organizationId,
  }).create()
  const inspection = await BoatInspection.create({
    reservationId: reservation.id,
    organizationId: boat.organizationId,
    kind,
    performedAt: reservation.startsAt,
    fuelLevel: 80,
    engineHours: null,
    notes: null,
  })
  return { reservation, inspection }
}

function actionsUrl(boatId: number, reservationId: number, inspectionId: number) {
  return `/boats/${boatId}/reservations/${reservationId}/inspections/${inspectionId}/equipment-actions`
}

test.group('Inspection → equipment actions (#311)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('creates an action linked to the inspection, boat_id deduced', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const { reservation, inspection } = await makeInspection(boat)

    const response = await client
      .post(actionsUrl(boat.id, reservation.id, inspection.id))
      .loginAs(admin)
      .form({ label: 'Winch tribord à remplacer', actionType: 'to_replace' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}/reservations/${reservation.id}/inspection`)

    const action = await BoatEquipmentAction.query()
      .where('inspectionId', inspection.id)
      .firstOrFail()
    assert.equal(action.boatId, boat.id)
    assert.equal(action.organizationId, boat.organizationId)
    assert.equal(action.inspectionId, inspection.id)
    assert.equal(action.actionType, 'to_replace')
    assert.equal(action.status, 'pending')
    assert.isNull(action.actualCost)
    assert.equal(action.createdBy, admin.id)
  })

  test('rejects a boatId that does not own the inspection (IDOR)', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boatA = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const boatB = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const { reservation, inspection } = await makeInspection(boatA)

    // Attacker passes boatB in the route but the reservation/inspection belong to boatA
    const response = await client
      .post(actionsUrl(boatB.id, reservation.id, inspection.id))
      .loginAs(admin)
      .form({ label: 'Injection', actionType: 'to_repair' })
      .redirects(0)

    response.assertStatus(302)
    const count = await BoatEquipmentAction.query().count('* as total')
    assert.equal(Number(count[0].$extras.total), 0)
  })

  test('cannot create under another organization inspection (IDOR)', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const other = await createAdminUser()
    const otherBoat = await BoatFactory.merge({ organizationId: other.organizationId! }).create()
    const { reservation, inspection } = await makeInspection(otherBoat)

    const response = await client
      .post(actionsUrl(otherBoat.id, reservation.id, inspection.id))
      .loginAs(admin)
      .form({ label: 'Hack', actionType: 'to_buy' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')
    const count = await BoatEquipmentAction.query().count('* as total')
    assert.equal(Number(count[0].$extras.total), 0)
  })

  test('the inspection page lists the linked actions', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const { reservation, inspection } = await makeInspection(boat)
    await BoatEquipmentAction.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      actionType: 'to_repair',
      status: 'pending',
      label: 'Voile grand-voile déchirée',
      inspectionId: inspection.id,
      createdBy: admin.id,
    })

    const response = await client
      .get(`/boats/${boat.id}/reservations/${reservation.id}/inspection`)
      .loginAs(admin)

    response.assertStatus(200)
    assert.include(response.text(), 'Voile grand-voile')
  })

  test('admin can delete an action from the inspection', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const { reservation, inspection } = await makeInspection(boat)
    const action = await BoatEquipmentAction.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      actionType: 'to_buy',
      status: 'pending',
      label: 'Extincteur',
      inspectionId: inspection.id,
      createdBy: admin.id,
    })

    const response = await client
      .delete(`${actionsUrl(boat.id, reservation.id, inspection.id)}/${action.id}`)
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)
    assert.isNull(await BoatEquipmentAction.find(action.id))
  })

  test('member cannot delete an action (admin-only)', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const { reservation, inspection } = await makeInspection(boat)
    const action = await BoatEquipmentAction.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      actionType: 'to_buy',
      status: 'pending',
      label: 'Gilet',
      inspectionId: inspection.id,
      createdBy: admin.id,
    })

    await client
      .delete(`${actionsUrl(boat.id, reservation.id, inspection.id)}/${action.id}`)
      .loginAs(member)
      .redirects(0)

    assert.isNotNull(await BoatEquipmentAction.find(action.id))
  })

  test('member can create (create is a member capability)', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const { reservation, inspection } = await makeInspection(boat)

    const response = await client
      .post(actionsUrl(boat.id, reservation.id, inspection.id))
      .loginAs(member)
      .form({ label: 'Défaut mineur', actionType: 'to_repair' })
      .redirects(0)

    response.assertStatus(302)
    const action = await BoatEquipmentAction.query().where('inspectionId', inspection.id).first()
    assert.isNotNull(action)
  })

  test('unauthenticated user is redirected to login', async ({ client }) => {
    const response = await client.post(actionsUrl(1, 1, 1)).redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})
