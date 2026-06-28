import BoatReservation from '#models/boat_reservation'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { DateTime } from 'luxon'

export const BoatReservationFactory = Factory.define(
  BoatReservation,
  ({ faker }: FactoryContextContract) => {
    const startsAt = DateTime.now().plus({ days: faker.number.int({ min: 1, max: 60 }) })
    const endsAt = startsAt.plus({ days: faker.number.int({ min: 1, max: 14 }) })
    return {
      status: faker.helpers.arrayElement(['option', 'confirmed'] as const),
      startsAt,
      endsAt,
      clientName: faker.person.fullName(),
      clientEmail: faker.internet.email(),
      clientPhone: null,
      notes: null,
      totalPrice: null,
    }
  }
).build()
