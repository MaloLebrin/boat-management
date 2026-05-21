import OrganizationService from '#services/organization_service'
import User from '#models/user'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'

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

  async signupWithOrganization(payload: {
    email: string
    password: string
    fullName?: string | null
  }) {
    return await db.transaction(async (trx) => {
      const organization = await this.organizationService.createForSignup(
        {
          email: payload.email,
          fullName: payload.fullName,
        },
        trx
      )

      const user = await User.create(
        {
          email: payload.email,
          password: payload.password,
          fullName: payload.fullName ?? null,
          organizationId: organization.id,
        },
        { client: trx }
      )

      return { organization, user }
    })
  }
}
