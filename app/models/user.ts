import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import Organization from '#models/organization'
import OrganizationMembership from '#models/organization_membership'
import Boat from '#models/boat'
import { beforeSave, belongsTo, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { DateTime } from 'luxon'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import type { OrgRole } from '#shared/types/organization'
import type { Capability } from '#shared/types/permissions'
import { ROLE_PERMISSIONS } from '#shared/types/permissions'
import { isStoredDashboardLayout, type StoredDashboardLayout } from '#shared/types/dashboard_layout'

export default class User extends compose(
  UserSchema,
  withAuthFinder(() => hash.use())
) {
  static rememberMeTokens = DbRememberMeTokensProvider.forModel(User)

  /**
   * Toute session ouverte **avant** cet instant est révoquée (#763).
   *
   * Posé à la réinitialisation du mot de passe et au changement depuis les
   * réglages. `null` = aucune révocation, l'état de tous les comptes avant la
   * migration.
   */
  @column.dateTime({ serializeAs: null })
  declare sessionsValidAfter: DateTime | null

  /**
   * Disposition personnalisée du tableau de bord (ordre des widgets par
   * colonne, widgets masqués). `null` = disposition par défaut. Un blob
   * illisible (version inconnue, ids retirés) est lu comme `null` plutôt que
   * de casser la page : l'utilisateur retrouve le défaut et repersonnalise.
   */
  @column({
    serializeAs: null,
    prepare: (value: StoredDashboardLayout | null) =>
      value === null ? null : JSON.stringify(value),
    consume: (value: unknown): StoredDashboardLayout | null => {
      const parsed: unknown = typeof value === 'string' ? JSON.parse(value) : value
      return isStoredDashboardLayout(parsed) ? parsed : null
    },
  })
  declare dashboardLayout: StoredDashboardLayout | null

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

  // `boat_owners` only has `created_at` (no `updated_at`) — cf. migration
  // 1820000003000_create_boat_owners_table.
  @manyToMany(() => Boat, {
    pivotTable: 'boat_owners',
    pivotTimestamps: { createdAt: true, updatedAt: false },
  })
  declare ownedBoats: ManyToMany<typeof Boat>

  get initials() {
    const [first, last] = this.fullName ? this.fullName.split(' ') : this.email.split('@')
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }

    return `${first.slice(0, 2)}`.toUpperCase()
  }

  /**
   * Rôle par organisation, mémoïsé sur l'instance. Une requête HTTP hydrate
   * un seul `User` (`auth.user`) que se partagent le middleware Inertia, les
   * policies Bouncer et `PermissionService` : sans cache, une page bateau
   * refaisait 10 à 20 fois le même SELECT sur `organization_memberships`.
   *
   * Chaque entrée porte la génération de `OrganizationMembership` au moment
   * de la lecture : toute écriture sur une adhésion (create/save/delete) la
   * rend caduque, y compris pour une instance déjà en vie. `forgetRoles()`
   * vide le cache à la main si besoin.
   */
  #roleCache = new Map<number, { role: OrgRole | null; generation: number }>()

  forgetRoles(): void {
    this.#roleCache.clear()
  }

  async getRoleInOrg(orgId: number): Promise<OrgRole | null> {
    const generation = OrganizationMembership.generation
    const cached = this.#roleCache.get(orgId)
    if (cached !== undefined && cached.generation === generation) {
      return cached.role
    }

    const membership = await OrganizationMembership.query()
      .where('userId', this.id)
      .where('organizationId', orgId)
      .first()
    const role = (membership?.role as OrgRole) ?? null
    this.#roleCache.set(orgId, { role, generation })
    return role
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
