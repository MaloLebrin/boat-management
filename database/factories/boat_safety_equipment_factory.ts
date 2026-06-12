import BoatSafetyEquipment from '#models/boat_safety_equipment'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { BoatFactory } from '#database/factories/boat_factory'

export const BoatSafetyEquipmentFactory = Factory.define(
  BoatSafetyEquipment,
  ({ faker }: FactoryContextContract) => ({
    equipmentType: faker.helpers.arrayElement([
      'life_jacket',
      'flare',
      'fire_extinguisher',
      'life_raft',
      'epirb',
      'anchor',
      'harness',
    ]),
    status: faker.helpers.arrayElement(['ok', 'to_check', 'expired']) as
      | 'ok'
      | 'to_check'
      | 'expired',
    quantity: faker.number.int({ min: 1, max: 10 }),
    expiryDate: null,
    notes: null,
  })
)
  .relation('boat', () => BoatFactory)
  .build()
