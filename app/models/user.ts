import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import Organization from '#models/organization'
import OrganizationMembership from '#models/organization_membership'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { OrgRole } from '#shared/types/organization'

export default class User extends compose(UserSchema, withAuthFinder(hash)) {
  static rememberMeTokens = DbRememberMeTokensProvider.forModel(User)

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
}
