import OrganizationInvitation from '#models/organization_invitation'
import type { InvitationStatus, OrgRole } from '#shared/types/organization'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { DateTime } from 'luxon'

export const OrganizationInvitationFactory = Factory.define(
  OrganizationInvitation,
  ({ faker }: FactoryContextContract) => ({
    email: faker.internet.email({ provider: 'example.com' }),
    role: faker.helpers.arrayElement(['admin', 'member']) as OrgRole,
    token: faker.string.uuid(),
    status: 'pending' as InvitationStatus,
    expiresAt: DateTime.now().plus({ days: 7 }),
    acceptedAt: null,
  })
)
  .relation('organization', () => OrganizationFactory)
  .build()
