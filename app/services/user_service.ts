import OrganizationService from '#services/organization_service'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'

export default class UserService {
  async signupWithOrganization(payload: {
    email: string
    password: string
    fullName?: string | null
  }) {
    return await db.transaction(async (trx) => {
      const organizationService = new OrganizationService()
      const organization = await organizationService.createForSignup(
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
