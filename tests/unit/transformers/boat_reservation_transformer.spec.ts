import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import {
  toBoatReservationRow,
  toFleetCalendarEntries,
} from '#transformers/boat_reservation_transformer'
import type BoatReservation from '#models/boat_reservation'
import type { BoatReservationRow } from '#shared/types/reservation'

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

function makeRow(overrides: Partial<BoatReservationRow> = {}): BoatReservationRow {
  return {
    ...toBoatReservationRow(makeReservation(), 'Boat'),
    ...overrides,
  }
}

test.group('toFleetCalendarEntries', () => {
  test('emits one entry per fleet boat, in the order given', ({ assert }) => {
    const entries = toFleetCalendarEntries(
      [
        { id: 1, name: 'Alizé' },
        { id: 2, name: 'Bora' },
        { id: 3, name: 'Cyclone' },
      ],
      []
    )

    assert.deepEqual(
      entries.map((e) => e.boatId),
      [1, 2, 3]
    )
    assert.deepEqual(
      entries.map((e) => e.boatName),
      ['Alizé', 'Bora', 'Cyclone']
    )
  })

  test('keeps boats without reservation with an empty list', ({ assert }) => {
    const entries = toFleetCalendarEntries(
      [
        { id: 1, name: 'Alizé' },
        { id: 2, name: 'Bora' },
      ],
      [makeRow({ id: 1, boatId: 1 })]
    )

    assert.lengthOf(entries, 2)
    assert.lengthOf(entries[0].reservations, 1)
    assert.isEmpty(entries[1].reservations)
  })

  test('groups several reservations under the same boat', ({ assert }) => {
    const entries = toFleetCalendarEntries(
      [{ id: 1, name: 'Alizé' }],
      [makeRow({ id: 1, boatId: 1 }), makeRow({ id: 2, boatId: 1 })]
    )

    assert.lengthOf(entries, 1)
    assert.deepEqual(
      entries[0].reservations.map((r) => r.id),
      [1, 2]
    )
  })

  test('ignores reservations whose boat is not in the fleet list', ({ assert }) => {
    const entries = toFleetCalendarEntries(
      [{ id: 1, name: 'Alizé' }],
      [makeRow({ id: 1, boatId: 1 }), makeRow({ id: 2, boatId: 99 })]
    )

    assert.lengthOf(entries, 1)
    assert.lengthOf(entries[0].reservations, 1)
  })

  test('returns an empty list when the fleet has no boat', ({ assert }) => {
    assert.isEmpty(toFleetCalendarEntries([], [makeRow()]))
  })
})
