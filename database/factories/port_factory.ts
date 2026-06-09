import Port from '#models/port'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { OrganizationFactory } from '#database/factories/organization_factory'

export const PortFactory = Factory.define(Port, ({ faker }: FactoryContextContract) => ({
  name: faker.location.city(),
  city: null,
  country: null,
  address: null,
  notes: null,
}))
  .relation('organization', () => OrganizationFactory)
  .build()
