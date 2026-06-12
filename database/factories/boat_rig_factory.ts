import BoatRig from '#models/boat_rig'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { BoatFactory } from '#database/factories/boat_factory'

export const BoatRigFactory = Factory.define(BoatRig, ({ faker }: FactoryContextContract) => ({
  rigType: faker.helpers.arrayElement(['sloop', 'ketch', 'yawl', 'schooner', 'cutter']),
  status: faker.helpers.arrayElement(['good', 'worn', 'to_replace']),
  mastCount: faker.number.int({ min: 1, max: 2 }),
  spreaders: faker.number.int({ min: 1, max: 3 }),
  manufacturedAt: null,
  notes: null,
}))
  .relation('boat', () => BoatFactory)
  .build()
