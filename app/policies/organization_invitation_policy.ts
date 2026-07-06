import type User from '#models/user'
import type OrganizationInvitation from '#models/organization_invitation'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import OrgScopedPolicy from '#utils/org_scoped_policy'

export default class OrganizationInvitationPolicy extends OrgScopedPolicy {
  async view(user: User, invitation: OrganizationInvitation): Promise<AuthorizerResponse> {
    return this.sameOrg(user, invitation) && (await this.can(user, 'invitations.view'))
  }

  async create(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'invitations.manage')
  }

  async revoke(user: User, invitation: OrganizationInvitation): Promise<AuthorizerResponse> {
    return this.sameOrg(user, invitation) && (await this.can(user, 'invitations.manage'))
  }
}
