import Pontoon from '#models/pontoon'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { PortFactory } from '#database/factories/port_factory'

export const PontoonFactory = Factory.define(Pontoon, ({ faker }: FactoryContextContract) => ({
  name: faker.word.noun(),
  description: null,
  positionX: null,
  positionY: null,
}))
  .relation('port', () => PortFactory)
  .build()
