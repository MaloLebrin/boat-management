import Mouillage from '#models/mouillage'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { PortFactory } from '#database/factories/port_factory'

export const MouillageFactory = Factory.define(Mouillage, ({ faker }: FactoryContextContract) => ({
  name: faker.word.noun() + ' ' + faker.number.int({ min: 1, max: 20 }),
  description: null,
  positionX: null,
  positionY: null,
}))
  .relation('port', () => PortFactory)
  .build()
