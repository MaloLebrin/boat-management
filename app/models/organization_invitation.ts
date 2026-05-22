import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import type { InvitationStatus, OrgRole } from '#shared/types/organization'
import User from '#models/user'
import Organization from '#models/organization'

export default class OrganizationInvitation extends BaseModel {
  static table = 'organization_invitations'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number

  @column()
  declare invitedById: number | null

  @column()
  declare email: string

  @column()
  declare role: OrgRole

  @column()
  declare token: string

  @column()
  declare status: InvitationStatus

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime()
  declare acceptedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => User, { foreignKey: 'invitedById' })
  declare invitedBy: BelongsTo<typeof User>
}
