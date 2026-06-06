import User from '#models/user'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { OrganizationFactory } from '#database/factories/organization_factory'

export const UserFactory = Factory.define(User, ({ faker }: FactoryContextContract) => ({
  email: faker.internet.email({ provider: 'example.com' }),
  password: 'Password123!',
  fullName: faker.person.fullName(),
}))
  .relation('organization', () => OrganizationFactory)
  .build()
