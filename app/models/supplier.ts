import { BaseModel, column } from '@adonisjs/lucid/orm'
import type { DateTime } from 'luxon'

/** Fournisseur de pièces d'une organisation (#892). */
export default class Supplier extends BaseModel {
  static table = 'suppliers'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number

  @column()
  declare name: string

  @column()
  declare contactName: string | null

  @column()
  declare email: string | null

  @column()
  declare phone: string | null

  @column()
  declare leadTimeDays: number | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
