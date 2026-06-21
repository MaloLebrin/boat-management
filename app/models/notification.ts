import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Organization from '#models/organization'
import User from '#models/user'
import type { NotificationSeverity, NotificationType } from '#shared/types/notification'

export default class Notification extends BaseModel {
  static table = 'notifications'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare organizationId: number

  @column()
  declare type: NotificationType

  @column()
  declare severity: NotificationSeverity

  @column()
  declare title: string

  @column()
  declare body: string | null

  @column()
  declare actionUrl: string | null

  @column({
    prepare: (v: Record<string, unknown> | null) => (v ? JSON.stringify(v) : null),
    consume: (v: unknown) => {
      if (!v) return null
      return typeof v === 'string' ? JSON.parse(v) : v
    },
  })
  declare metadata: Record<string, unknown> | null

  @column.dateTime()
  declare readAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  get isRead(): boolean {
    return this.readAt !== null
  }

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
