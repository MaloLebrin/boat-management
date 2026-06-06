import Boat from '#models/boat'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { OrganizationFactory } from '#database/factories/organization_factory'

export const BoatFactory = Factory.define(Boat, ({ faker }: FactoryContextContract) => ({
  name: `${faker.word.adjective()} ${faker.word.noun()}`,
  registrationNumber: faker.string.alphanumeric(8).toUpperCase(),
  propulsionType: faker.helpers.arrayElement(['sailboat', 'motorboat', 'sailboat']),
  lengthM: faker.number.float({ min: 6, max: 20, fractionDigits: 1 }),
  beamM: faker.number.float({ min: 2, max: 6, fractionDigits: 1 }),
}))
  .relation('organization', () => OrganizationFactory)
  .build()
