import BoatFuelLog from '#models/boat_fuel_log'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { DateTime } from 'luxon'

export const BoatFuelLogFactory = Factory.define(
  BoatFuelLog,
  ({ faker }: FactoryContextContract) => ({
    fueledAt: DateTime.fromJSDate(faker.date.recent({ days: 90 })),
    quantityLiters: String(faker.number.float({ min: 10, max: 400, fractionDigits: 3 })),
    pricePerLiter: String(faker.number.float({ min: 1.5, max: 3.0, fractionDigits: 4 })),
    totalCost: null,
    engineHoursAtFueling: null,
    supplier: null,
    notes: null,
  })
).build()
