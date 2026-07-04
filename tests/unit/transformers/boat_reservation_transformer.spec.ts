import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { toBoatReservationRow } from '#transformers/boat_reservation_transformer'
import type BoatReservation from '#models/boat_reservation'

function makeReservation(overrides: Partial<BoatReservation> = {}): BoatReservation {
  return {
    id: 1,
    boatId: 10,
    organizationId: 2,
    status: 'confirmed',
    startsAt: DateTime.fromISO('2026-07-10T09:00:00.000Z'),
    endsAt: DateTime.fromISO('2026-07-17T09:00:00.000Z'),
    clientName: 'Alice Martin',
    clientEmail: 'alice@example.com',
    clientPhone: '+33600000001',
    notes: 'Special requests',
    totalPrice: '1500.00',
    createdAt: DateTime.fromISO('2026-07-04T10:00:00.000Z'),
    ...overrides,
  } as unknown as BoatReservation
}

test.group('toBoatReservationRow', () => {
  test('maps all fields on the happy path', ({ assert }) => {
    const reservation = makeReservation()
    const result = toBoatReservationRow(reservation, 'Mon Bateau')

    assert.equal(result.id, 1)
    assert.equal(result.boatId, 10)
    assert.equal(result.boatName, 'Mon Bateau')
    assert.equal(result.organizationId, 2)
    assert.equal(result.status, 'confirmed')
    assert.isString(result.startsAt)
    assert.isString(result.endsAt)
    assert.equal(result.clientName, 'Alice Martin')
    assert.equal(result.clientEmail, 'alice@example.com')
    assert.equal(result.clientPhone, '+33600000001')
    assert.equal(result.notes, 'Special requests')
    assert.equal(result.totalPrice, '1500.00')
    assert.isString(result.createdAt)
  })

  test('boatName is passed through as-is', ({ assert }) => {
    const reservation = makeReservation()
    const result = toBoatReservationRow(reservation, 'Voilier Liberté')
    assert.equal(result.boatName, 'Voilier Liberté')
  })

  test('nullable fields clientEmail, clientPhone, notes, totalPrice stay null', ({ assert }) => {
    const reservation = makeReservation({
      clientEmail: null,
      clientPhone: null,
      notes: null,
      totalPrice: null,
    })
    const result = toBoatReservationRow(reservation, 'Boat')
    assert.isNull(result.clientEmail)
    assert.isNull(result.clientPhone)
    assert.isNull(result.notes)
    assert.isNull(result.totalPrice)
  })

  test('startsAt and endsAt are ISO strings', ({ assert }) => {
    const reservation = makeReservation()
    const result = toBoatReservationRow(reservation, 'Boat')
    assert.match(result.startsAt, /^\d{4}-\d{2}-\d{2}T/)
    assert.match(result.endsAt, /^\d{4}-\d{2}-\d{2}T/)
  })
})
