import CrewMember from '#models/crew_member'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'

/** `organizationId` à fournir via `merge()`. */
export const CrewMemberFactory = Factory.define(
  CrewMember,
  ({ faker }: FactoryContextContract) => ({
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email({ provider: 'example.com' }),
    phone: null,
    notes: null,
  })
).build()
