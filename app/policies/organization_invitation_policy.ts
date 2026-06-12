import type User from '#models/user'
import type OrganizationInvitation from '#models/organization_invitation'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

export default class OrganizationInvitationPolicy extends BasePolicy {
  async before(user: User) {
    if (user.organizationId && (await user.isAdminOf(user.organizationId))) {
      return true
    }
  }

  view(user: User, invitation: OrganizationInvitation): AuthorizerResponse {
    return user.organizationId !== null && user.organizationId === invitation.organizationId
  }

  create(_user: User): AuthorizerResponse {
    return false
  }

  revoke(_user: User, _invitation: OrganizationInvitation): AuthorizerResponse {
    return false
  }
}
