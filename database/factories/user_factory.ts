import User from '#models/user'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { OrganizationFactory } from '#database/factories/organization_factory'

export const UserFactory = Factory.define(User, ({ faker }: FactoryContextContract) => ({
  // Guaranteed-unique local-part (uuid) to avoid `users_email_unique` collisions:
  // the whole test suite shares one database and some groups don't truncate
  // between tests, so a name-derived faker email could be drawn twice per run.
  email: `user-${faker.string.uuid()}@example.com`,
  password: 'Password123!',
  fullName: faker.person.fullName(),
}))
  .relation('organization', () => OrganizationFactory)
  .build()
