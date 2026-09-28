import Invoice from '#models/invoice'
import User from '#models/user'
import type {
  InvoiceReminderOutcome,
  InvoiceReminderSkipReason,
  InvoiceReminderTrigger,
} from '#shared/types/invoice_reminder'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

/** Historique des relances d'une facture en retard (#878). */
export default class InvoiceReminder extends BaseModel {
  static table = 'invoice_reminders'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number

  @column()
  declare invoiceId: number

  @column()
  declare tier: number

  @column()
  declare trigger: InvoiceReminderTrigger

  @column()
  declare outcome: InvoiceReminderOutcome

  @column()
  declare skipReason: InvoiceReminderSkipReason | null

  /** Auteur d'une relance manuelle ; `null` pour le job quotidien. */
  @column()
  declare userId: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Invoice)
  declare invoice: BelongsTo<typeof Invoice>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
