import User from '#models/user'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { DateTime } from 'luxon'
import { OrganizationFactory } from '#database/factories/organization_factory'

export const UserFactory = Factory.define(User, ({ faker }: FactoryContextContract) => ({
  // Guaranteed-unique local-part (uuid) to avoid `users_email_unique` collisions:
  // the whole test suite shares one database and some groups don't truncate
  // between tests, so a name-derived faker email could be drawn twice per run.
  email: `user-${faker.string.uuid()}@example.com`,
  password: 'Password123!',
  fullName: faker.person.fullName(),
  // Un utilisateur de fabrique représente un **compte établi** (#768), comme
  // ceux que la migration marque vérifiés : la garde de vérification ne doit
  // pas surgir dans des tests qui n'ont rien à voir avec elle. Un compte
  // fraîchement inscrit se construit en remettant `emailVerifiedAt` à `null`.
  emailVerifiedAt: DateTime.now(),
}))
  .relation('organization', () => OrganizationFactory)
  .build()
