import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { createCharterAdminUser } from '#tests/functional/helpers'
import BoatReservation from '#models/boat_reservation'
import { RESERVATION_TYPES } from '#shared/types/reservation'

const VALID_RESERVATION = {
  startsAt: '2025-08-01T10:00',
  endsAt: '2025-08-10T10:00',
  clientName: 'Alice Martin',
  status: 'option',
}

/** Type de prestation d'une réservation (#585). */
test.group('Reservation type (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST enregistre chacun des types de prestation', async ({ client, assert }) => {
    const user = await createCharterAdminUser()

    for (const [index, type] of RESERVATION_TYPES.entries()) {
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
      await client
        .post(`/boats/${boat.id}/reservations`)
        .loginAs(user)
        .form({ ...VALID_RESERVATION, type })

      const reservation = await BoatReservation.query().where('boatId', boat.id).firstOrFail()
      assert.equal(reservation.type, type, `type #${index}`)
    }
  })

  test('POST sans type laisse la réservation sans type', async ({ client, assert }) => {
    const user = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client.post(`/boats/${boat.id}/reservations`).loginAs(user).form(VALID_RESERVATION)

    const reservation = await BoatReservation.query().where('boatId', boat.id).firstOrFail()
    assert.isNull(reservation.type)
  })

  test('POST refuse un type hors vocabulaire', async ({ client, assert }) => {
    const user = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client
      .post(`/boats/${boat.id}/reservations`)
      .loginAs(user)
      .form({ ...VALID_RESERVATION, type: 'regatta' })

    assert.isNull(await BoatReservation.query().where('boatId', boat.id).first())
  })

  test('PATCH renseigne puis efface le type', async ({ client, assert }) => {
    const user = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
    }).create()

    await client
      .patch(`/boats/${boat.id}/reservations/${reservation.id}`)
      .loginAs(user)
      .form({ type: 'skippered' })

    await reservation.refresh()
    assert.equal(reservation.type, 'skippered')

    await client
      .patch(`/boats/${boat.id}/reservations/${reservation.id}`)
      .loginAs(user)
      .form({ type: '' })

    await reservation.refresh()
    assert.isNull(reservation.type)
  })

  test('PATCH sans champ `type` ne touche pas au type existant', async ({ client, assert }) => {
    const user = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      type: 'cabin',
    }).create()

    await client
      .patch(`/boats/${boat.id}/reservations/${reservation.id}`)
      .loginAs(user)
      .form({ clientName: 'Autre nom' })

    await reservation.refresh()
    assert.equal(reservation.type, 'cabin')
  })

  test('GET /reservations filtre la liste par type de prestation', async ({ client, assert }) => {
    const user = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      type: 'bareboat',
      clientName: 'Coque nue',
    }).create()
    await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      type: 'skippered',
      clientName: 'Avec skipper',
    }).create()

    const response = await client.get('/reservations?type=skippered').loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as {
      reservations: Array<{ clientName: string; type: string | null }>
      selectedType: string | null
    }
    assert.equal(props.selectedType, 'skippered')
    assert.lengthOf(props.reservations, 1)
    assert.equal(props.reservations[0].clientName, 'Avec skipper')
  })

  test('GET /reservations ignore un filtre de type inconnu', async ({ client, assert }) => {
    const user = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      type: 'bareboat',
    }).create()

    const response = await client.get('/reservations?type=regatta').loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as {
      reservations: unknown[]
      selectedType: string | null
    }
    assert.isNull(props.selectedType)
    assert.lengthOf(props.reservations, 1)
  })
})
