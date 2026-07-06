import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import Organization from '#models/organization'
import OrganizationMembership from '#models/organization_membership'
import { beforeSave, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { OrgRole } from '#shared/types/organization'
import type { Capability } from '#shared/types/permissions'
import { ROLE_PERMISSIONS } from '#shared/types/permissions'

export default class User extends compose(
  UserSchema,
  withAuthFinder(() => hash.use())
) {
  static rememberMeTokens = DbRememberMeTokensProvider.forModel(User)

  @beforeSave()
  static normalizeEmail(user: User) {
    if (user.$dirty.email) {
      user.email = user.email.toLowerCase()
    }
  }

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @hasMany(() => OrganizationMembership)
  declare memberships: HasMany<typeof OrganizationMembership>

  get initials() {
    const [first, last] = this.fullName ? this.fullName.split(' ') : this.email.split('@')
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }

    return `${first.slice(0, 2)}`.toUpperCase()
  }

  async getRoleInOrg(orgId: number): Promise<OrgRole | null> {
    const membership = await OrganizationMembership.query()
      .where('userId', this.id)
      .where('organizationId', orgId)
      .first()
    return (membership?.role as OrgRole) ?? null
  }

  async isAdminOf(orgId: number): Promise<boolean> {
    const role = await this.getRoleInOrg(orgId)
    return role === 'admin'
  }

  /**
   * Resolves the role to use for authorization purposes, including the
   * legacy fallback: a user linked to this org via the organizationId FK but
   * missing an explicit membership row defaults to 'member', matching the
   * pre-capability behavior (any org-linked user could act as a member)
   * until the self-heal (ensureMembershipsForOrgUsers) backfills the row.
   *
   * Both hasPermission() and PermissionService.sharedProps() must go through
   * this single method so the backend authorization result and the
   * frontend-visible capabilities never drift apart.
   */
  async getEffectiveRoleInOrg(orgId: number): Promise<OrgRole | null> {
    const role = await this.getRoleInOrg(orgId)
    if (role) return role
    return this.organizationId === orgId ? 'member' : null
  }

  async hasPermission(orgId: number, capability: Capability): Promise<boolean> {
    const role = await this.getEffectiveRoleInOrg(orgId)
    if (!role) return false
    return ROLE_PERMISSIONS[role].has(capability)
  }
}
