import { afterDelete, afterSave, BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import type { OrgRole } from '#shared/types/organization'
import User from '#models/user'
import Organization from '#models/organization'

export default class OrganizationMembership extends BaseModel {
  static table = 'organization_memberships'

  /**
   * Compteur incrémenté à chaque écriture d'une adhésion : `User#getRoleInOrg`
   * l'utilise pour invalider son cache de rôles (voir `app/models/user.ts`).
   * Les écritures en masse (`query().update()`) ne passent pas par les hooks —
   * il n'y en a aucune aujourd'hui ; en ajouter une impose d'appeler
   * `OrganizationMembership.invalidateRoles()`.
   */
  static generation = 0

  static invalidateRoles(): void {
    OrganizationMembership.generation++
  }

  @afterSave()
  static invalidateRolesAfterSave() {
    OrganizationMembership.invalidateRoles()
  }

  @afterDelete()
  static invalidateRolesAfterDelete() {
    OrganizationMembership.invalidateRoles()
  }

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare organizationId: number

  @column()
  declare role: OrgRole

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
