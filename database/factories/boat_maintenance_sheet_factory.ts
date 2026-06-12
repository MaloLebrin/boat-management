import BoatMaintenanceSheet from '#models/boat_maintenance_sheet'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { DateTime } from 'luxon'

export const BoatMaintenanceSheetFactory = Factory.define(
  BoatMaintenanceSheet,
  ({ faker }: FactoryContextContract) => ({
    title: faker.lorem.words(2),
    notes: null,
    performedAt: DateTime.fromJSDate(faker.date.past()),
    status: faker.helpers.arrayElement(['draft', 'in_progress', 'completed']),
    type: faker.helpers.arrayElement(['winter', 'annual', 'custom']),
  })
)
  .relation('boat', () => BoatFactory)
  .build()
