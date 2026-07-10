import { BoatFactory } from '#database/factories/boat_factory'
import BoatGenericEquipment from '#models/boat_generic_equipment'
import { GENERIC_EQUIPMENT_CATEGORIES } from '#shared/types/boat'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'

export const BoatGenericEquipmentFactory = Factory.define(
  BoatGenericEquipment,
  ({ faker }: FactoryContextContract) => ({
    name: faker.commerce.productName(),
    brand: faker.company.name(),
    model: faker.string.alphanumeric(6).toUpperCase(),
    category: faker.helpers.arrayElement(GENERIC_EQUIPMENT_CATEGORIES),
    quantity: faker.number.int({ min: 1, max: 10 }),
    status: faker.helpers.arrayElement(['ok', 'to_check', 'to_replace']) as
      | 'ok'
      | 'to_check'
      | 'to_replace',
    notes: null,
  })
)
  .relation('boat', () => BoatFactory)
  .build()
