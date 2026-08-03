import OrganizationService from '#services/organization_service'
import User from '#models/user'
import OrganizationMembership from '#models/organization_membership'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import type { SignupInput } from '#shared/types/organization'
import { joinFullName } from '#shared/helpers/full_name'

@inject()
export default class UserService {
  constructor(private organizationService: OrganizationService) {}

  /**
   * Verifies user credentials and returns the user if valid.
   * Wraps User.verifyCredentials for use in controllers.
   */
  async verifyCredentials(email: string, password: string): Promise<User> {
    return await User.verifyCredentials(email, password)
  }

  /**
   * Creates the organization, its owner and the admin membership in one
   * transaction. Every field collected by the signup form is persisted (#448):
   * first/last name are joined into `users.full_name`, and the organization
   * name / type / fleet size land on the organization itself.
   */
  async signupWithOrganization(payload: SignupInput) {
    const fullName = joinFullName(payload.firstName, payload.lastName)

    return await db.transaction(async (trx) => {
      const organization = await this.organizationService.createForSignup(
        {
          name: payload.organizationName,
          type: payload.organizationType,
          fleetSize: payload.fleetSize,
        },
        trx
      )

      const user = await User.create(
        {
          email: payload.email,
          password: payload.password,
          fullName,
          organizationId: organization.id,
        },
        { client: trx }
      )

      await OrganizationMembership.create(
        { userId: user.id, organizationId: organization.id, role: 'admin' },
        { client: trx }
      )

      return { organization, user }
    })
  }
}
