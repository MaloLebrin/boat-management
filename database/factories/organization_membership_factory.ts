import OrganizationMembership from '#models/organization_membership'
import type { OrgRole } from '#shared/types/organization'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { UserFactory } from '#database/factories/user_factory'

export const OrganizationMembershipFactory = Factory.define(
  OrganizationMembership,
  ({ faker }: FactoryContextContract) => ({
    role: faker.helpers.arrayElement(['admin', 'member']) as OrgRole,
  })
)
  .relation('user', () => UserFactory)
  .relation('organization', () => OrganizationFactory)
  .build()
