import BoatEnginePart from '#models/boat_engine_part'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'

export const BoatEnginePartFactory = Factory.define(
  BoatEnginePart,
  ({ faker }: FactoryContextContract) => ({
    designation: faker.commerce.productName(),
    reference: faker.string.alphanumeric(8).toUpperCase(),
    stock: faker.number.int({ min: 0, max: 20 }),
    minStockAlert: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 5 })) ?? null,
    wearState: faker.helpers.arrayElement(['good', 'worn', 'to_replace']),
  })
).build()
