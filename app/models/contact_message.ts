import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { ContactFleetSize, ContactSubject } from '#shared/types/contact'

export default class ContactMessage extends BaseModel {
  static table = 'contact_messages'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare subject: ContactSubject

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare email: string

  @column()
  declare organization: string | null

  @column()
  declare fleetSize: ContactFleetSize | null

  @column()
  declare message: string

  @column()
  declare locale: string

  @column()
  declare ipAddress: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
