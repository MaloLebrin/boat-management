import Invoice from '#models/invoice'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class InvoiceLine extends BaseModel {
  static table = 'invoice_lines'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare invoiceId: number

  @column()
  declare label: string

  @column()
  declare quantity: string

  @column()
  declare unitPrice: string

  @column()
  declare amount: string

  @column()
  declare position: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Invoice)
  declare invoice: BelongsTo<typeof Invoice>
}
