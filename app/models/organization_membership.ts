import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import type { OrgRole } from '#shared/types/organization'
import User from '#models/user'
import Organization from '#models/organization'

export default class OrganizationMembership extends BaseModel {
  static table = 'organization_memberships'

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
