import Client from '#models/client'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import type { ClientStatus, ClientPermitType } from '#shared/types/client'

export const ClientFactory = Factory.define(Client, ({ faker }: FactoryContextContract) => {
  const statuses: ClientStatus[] = ['active', 'inactive', 'blacklisted']
  const permitTypes: ClientPermitType[] = ['coastal', 'offshore', 'inland', 'other']

  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email({ provider: 'example.com' }),
    phone: faker.phone.number(),
    address: faker.location.streetAddress(),
    navigationPermitNumber: faker.string.alphanumeric(10).toUpperCase(),
    navigationPermitType: faker.helpers.arrayElement(permitTypes),
    status: faker.helpers.arrayElement(statuses),
    notes: faker.lorem.sentence(),
  }
})
  .relation('organization', () => OrganizationFactory)
  .build()
