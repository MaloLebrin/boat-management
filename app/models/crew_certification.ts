import CrewMember from '#models/crew_member'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import type { CrewCertificationType } from '#shared/types/crew'

export default class CrewCertification extends BaseModel {
  static table = 'crew_certifications'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare crewMemberId: number

  @column()
  declare type: CrewCertificationType

  @column()
  declare referenceNumber: string | null

  @column.date()
  declare expiresAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => CrewMember)
  declare crewMember: BelongsTo<typeof CrewMember>

  get isExpired(): boolean {
    if (!this.expiresAt) return false
    return this.expiresAt < DateTime.now().startOf('day')
  }

  get expiresInDays(): number | null {
    if (!this.expiresAt) return null
    return Math.ceil(this.expiresAt.diff(DateTime.now().startOf('day'), 'days').days)
  }
}
