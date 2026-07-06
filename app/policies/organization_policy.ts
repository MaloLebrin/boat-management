import type User from '#models/user'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import OrgScopedPolicy from '#utils/org_scoped_policy'

export default class OrganizationPolicy extends OrgScopedPolicy {
  async viewMembers(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'members.view')
  }

  async manageMembers(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'members.manage')
  }

  async configureAI(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'ai.configure')
  }

  async configureBranding(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'branding.configure')
  }

  async viewAuditLog(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'audit_log.view')
  }
}
