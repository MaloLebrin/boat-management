import BoatSail from '#models/boat_sail'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { BoatFactory } from '#database/factories/boat_factory'

export const BoatSailFactory = Factory.define(BoatSail, ({ faker }: FactoryContextContract) => ({
  sailType: faker.helpers.arrayElement(['main', 'jib', 'genoa', 'spinnaker', 'gennaker']),
  status: faker.helpers.arrayElement(['operational', 'in_maintenance', 'out_of_service']),
  areaM2: faker.number.float({ min: 10, max: 80, fractionDigits: 1 }),
  material: faker.helpers.arrayElement(['dacron', 'laminate', 'nylon_spi']),
  reefPoints: faker.number.int({ min: 0, max: 3 }),
  manufacturedAt: null,
  notes: null,
  sailmaker: null,
  sailLoftId: null,
}))
  .relation('boat', () => BoatFactory)
  .build()
