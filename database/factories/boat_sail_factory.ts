import BoatSail from '#models/boat_sail'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { BoatFactory } from '#database/factories/boat_factory'

export const BoatSailFactory = Factory.define(BoatSail, ({ faker }: FactoryContextContract) => ({
  sailType: faker.helpers.arrayElement(['mainsail', 'jib', 'genoa', 'spinnaker', 'gennaker']),
  status: faker.helpers.arrayElement(['good', 'worn', 'to_replace']),
  areaM2: faker.number.float({ min: 10, max: 80, fractionDigits: 1 }),
  material: faker.helpers.arrayElement(['dacron', 'laminate', 'nylon']),
  reefPoints: faker.number.int({ min: 0, max: 3 }),
  manufacturedAt: null,
  notes: null,
}))
  .relation('boat', () => BoatFactory)
  .build()
