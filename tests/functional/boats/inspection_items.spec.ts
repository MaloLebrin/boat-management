import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { createCharterAdminUser, createEnterprisePlanUser } from '#tests/functional/helpers'
import BoatInspection from '#models/boat_inspection'
import BoatInspectionItem from '#models/boat_inspection_item'
import { DateTime } from 'luxon'

async function makeInspection(reservationId: number, organizationId: number, kind = 'checkout') {
  return BoatInspection.create({
    reservationId,
    organizationId,
    kind,
    performedAt: DateTime.utc(),
  })
}

async function itemsFor(inspectionId: number) {
  return BoatInspectionItem.query().where('boatInspectionId', inspectionId).orderBy('itemKey')
}

test.group('Boat inspection checklist items (functional)', (group) => {
  group.each.setup(() => truncateDb())

  async function setupInspection() {
    const user = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()
    const inspection = await makeInspection(reservation.id, boat.organizationId)
    return { user, boat, reservation, inspection }
  }

  function itemsUrl(boatId: number, reservationId: number, inspectionId: number) {
    return `/boats/${boatId}/reservations/${reservationId}/inspections/${inspectionId}/items`
  }

  test('PATCH items records an ok state on a tap', async ({ client, assert }) => {
    const { user, boat, reservation, inspection } = await setupInspection()

    const response = await client
      .patch(itemsUrl(boat.id, reservation.id, inspection.id))
      .loginAs(user)
      .form({ itemKey: 'hull_deck.hull_condition', state: 'ok' })
      .redirects(0)

    response.assertStatus(302)
    const items = await itemsFor(inspection.id)
    assert.lengthOf(items, 1)
    assert.equal(items[0].itemKey, 'hull_deck.hull_condition')
    assert.equal(items[0].state, 'ok')
    assert.isNull(items[0].note)
  })

  test('PATCH items upserts: a second call updates the same row', async ({ client, assert }) => {
    const { user, boat, reservation, inspection } = await setupInspection()
    const url = itemsUrl(boat.id, reservation.id, inspection.id)

    await client
      .patch(url)
      .loginAs(user)
      .form({ itemKey: 'engine.engine_oil', state: 'ok' })
      .redirects(0)
    await client
      .patch(url)
      .loginAs(user)
      .form({ itemKey: 'engine.engine_oil', state: 'remark', note: 'Niveau un peu bas' })
      .redirects(0)

    const items = await itemsFor(inspection.id)
    assert.lengthOf(items, 1)
    assert.equal(items[0].state, 'remark')
    assert.equal(items[0].note, 'Niveau un peu bas')
  })

  test('PATCH items back to ok clears the note', async ({ client, assert }) => {
    const { user, boat, reservation, inspection } = await setupInspection()
    const url = itemsUrl(boat.id, reservation.id, inspection.id)

    await client
      .patch(url)
      .loginAs(user)
      .form({ itemKey: 'engine.engine_oil', state: 'damage', note: 'Fuite' })
      .redirects(0)
    await client.patch(url).loginAs(user).form({ itemKey: 'engine.engine_oil', state: 'ok' })

    const items = await itemsFor(inspection.id)
    assert.lengthOf(items, 1)
    assert.equal(items[0].state, 'ok')
    assert.isNull(items[0].note)
  })

  test('PATCH items requires a note for remark and damage', async ({ client, assert }) => {
    const { user, boat, reservation, inspection } = await setupInspection()

    for (const state of ['remark', 'damage']) {
      const response = await client
        .patch(itemsUrl(boat.id, reservation.id, inspection.id))
        .loginAs(user)
        .form({ itemKey: 'safety.lifejackets', state })
        .redirects(0)

      response.assertStatus(302)
      assert.lengthOf(await itemsFor(inspection.id), 0)
    }
  })

  test('PATCH items rejects an itemKey outside the corpus', async ({ client, assert }) => {
    const { user, boat, reservation, inspection } = await setupInspection()

    const response = await client
      .patch(itemsUrl(boat.id, reservation.id, inspection.id))
      .loginAs(user)
      .form({ itemKey: 'hull_deck.not_a_real_item', state: 'ok' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Unknown checklist item.')
    assert.lengthOf(await itemsFor(inspection.id), 0)
  })

  test('DELETE items resets a point back to not inspected', async ({ client, assert }) => {
    const { user, boat, reservation, inspection } = await setupInspection()
    await BoatInspectionItem.create({
      boatInspectionId: inspection.id,
      itemKey: 'safety.extinguishers',
      state: 'ok',
    })

    const response = await client
      .delete(itemsUrl(boat.id, reservation.id, inspection.id))
      .loginAs(user)
      .form({ itemKey: 'safety.extinguishers' })
      .redirects(0)

    response.assertStatus(302)
    assert.lengthOf(await itemsFor(inspection.id), 0)
  })

  test('PATCH items rejects a cross-org attempt and stores nothing', async ({ client, assert }) => {
    const { boat, reservation, inspection } = await setupInspection()
    const other = await createEnterprisePlanUser()

    const response = await client
      .patch(itemsUrl(boat.id, reservation.id, inspection.id))
      .loginAs(other)
      .form({ itemKey: 'hull_deck.hull_condition', state: 'ok' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')
    assert.lengthOf(await itemsFor(inspection.id), 0)
  })

  test('PATCH items on an inspection of another reservation flashes not found', async ({
    client,
    assert,
  }) => {
    const { user, boat, reservation } = await setupInspection()
    const otherReservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()
    const foreignInspection = await makeInspection(otherReservation.id, boat.organizationId)

    const response = await client
      .patch(itemsUrl(boat.id, reservation.id, foreignInspection.id))
      .loginAs(user)
      .form({ itemKey: 'hull_deck.hull_condition', state: 'ok' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Inspection not found.')
    assert.lengthOf(await itemsFor(foreignInspection.id), 0)
  })

  test('deleting the inspection cascades its checklist items', async ({ client, assert }) => {
    const { user, boat, reservation, inspection } = await setupInspection()
    await BoatInspectionItem.create({
      boatInspectionId: inspection.id,
      itemKey: 'hull_deck.hull_condition',
      state: 'damage',
      note: 'Rayure tribord',
    })

    await client
      .delete(`/boats/${boat.id}/reservations/${reservation.id}/inspections/${inspection.id}`)
      .loginAs(user)
      .redirects(0)

    assert.lengthOf(await itemsFor(inspection.id), 0)
  })

  test('GET .../inspection exposes the items of both inspections for comparison', async ({
    client,
  }) => {
    const { user, boat, reservation, inspection } = await setupInspection()
    const checkin = await makeInspection(reservation.id, boat.organizationId, 'checkin')
    await BoatInspectionItem.create({
      boatInspectionId: inspection.id,
      itemKey: 'hull_deck.hull_condition',
      state: 'ok',
    })
    await BoatInspectionItem.create({
      boatInspectionId: checkin.id,
      itemKey: 'hull_deck.hull_condition',
      state: 'damage',
      note: 'Impact sur le liston',
    })

    const response = await client
      .get(`/boats/${boat.id}/reservations/${reservation.id}/inspection`)
      .loginAs(user)
      .withInertia()

    response.assertStatus(200)
    // Ordre de listForReservation : orderBy kind asc → checkin avant checkout.
    response.assertInertiaPropsContains({
      inspections: [
        {
          kind: 'checkin',
          items: [
            { itemKey: 'hull_deck.hull_condition', state: 'damage', note: 'Impact sur le liston' },
          ],
        },
        {
          kind: 'checkout',
          items: [{ itemKey: 'hull_deck.hull_condition', state: 'ok', note: null }],
        },
      ],
    })
  })
})
