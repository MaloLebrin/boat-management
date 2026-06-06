import BoatEngine from '#models/boat_engine'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'

export const BoatEngineFactory = Factory.define(
  BoatEngine,
  ({ faker }: FactoryContextContract) => ({
    kind: faker.helpers.arrayElement(['inboard', 'outboard', 'electric']),
    fuel: faker.helpers.arrayElement(['diesel', 'essence', 'electric']),
    brand: faker.helpers.arrayElement(['Yanmar', 'Volvo Penta', 'Yamaha', 'Torqeedo', 'Honda']),
    model: faker.string.alphanumeric(4).toUpperCase(),
    serialNumber: faker.string.alphanumeric(10).toUpperCase(),
    powerHp: faker.number.int({ min: 5, max: 200 }),
    hours: faker.number.int({ min: 0, max: 5000 }),
    status: 'operational',
  })
).build()
