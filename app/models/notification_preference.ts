import { BaseModel, column } from '@adonisjs/lucid/orm'
import type { DateTime } from 'luxon'
import type { NotificationFamily } from '#shared/types/notification'

/** Réglage d'une famille de notifications pour un utilisateur (#888). */
export default class NotificationPreference extends BaseModel {
  static table = 'notification_preferences'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare family: NotificationFamily

  @column()
  declare inApp: boolean

  @column()
  declare push: boolean

  @column()
  declare email: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
