import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { DateTime } from 'luxon'

export const BoatMaintenanceEventFactory = Factory.define(
  BoatMaintenanceEvent,
  ({ faker }: FactoryContextContract) => ({
    title: faker.lorem.words(3),
    subject: faker.helpers.arrayElement([
      'hull',
      'engine',
      'safety',
      'rigging',
      'electrical',
      'other',
    ]),
    performedAt: DateTime.fromJSDate(faker.date.past()),
    dueAt: null,
    notes: faker.helpers.maybe(() => faker.lorem.sentence()) ?? null,
    engineCaption: null,
    sailCaption: null,
  })
)
  .relation('boat', () => BoatFactory)
  .build()
