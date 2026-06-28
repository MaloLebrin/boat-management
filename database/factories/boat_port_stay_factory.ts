import BoatPortStay from '#models/boat_port_stay'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { DateTime } from 'luxon'

export const BoatPortStayFactory = Factory.define(
  BoatPortStay,
  ({ faker }: FactoryContextContract) => {
    const startedAt = DateTime.fromJSDate(faker.date.past({ years: 2 }))
    return {
      portName: faker.location.city(),
      startedAt,
      endedAt: startedAt.plus({ days: faker.number.int({ min: 1, max: 14 }) }),
      cost: String(faker.number.float({ min: 20, max: 500, fractionDigits: 2 })),
      notes: null,
    }
  }
).build()
