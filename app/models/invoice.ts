import Organization from '#models/organization'
import Client from '#models/client'
import BoatReservation from '#models/boat_reservation'
import InvoiceLine from '#models/invoice_line'
import InvoiceReminder from '#models/invoice_reminder'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import type { InvoiceKind, InvoicePaymentMethod, InvoiceStatus } from '#shared/types/invoice'

export default class Invoice extends BaseModel {
  static table = 'invoices'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number

  @column()
  declare clientId: number | null

  @column()
  declare reservationId: number | null

  @column()
  declare kind: InvoiceKind

  @column()
  declare number: string

  @column()
  declare clientName: string | null

  @column()
  declare status: InvoiceStatus

  @column.date()
  declare issuedAt: DateTime

  @column.date()
  declare dueAt: DateTime | null

  @column.date()
  declare paidAt: DateTime | null

  @column()
  declare paymentMethod: InvoicePaymentMethod | null

  @column()
  declare sourceQuoteId: number | null

  /** Avoir (#877) : la facture qu'il corrige. */
  @column()
  declare creditedInvoiceId: number | null

  /**
   * Jeton opaque de la page publique `/pay/:token` (#876) : il suffit à
   * ouvrir le paiement, il ne sort donc jamais d'une sérialisation — la fiche
   * n'en expose que l'URL, via le transformer.
   */
  @column({ serializeAs: null })
  declare paymentToken: string | null

  @column()
  declare stripeCheckoutSessionId: string | null

  @column()
  declare stripePaymentIntentId: string | null

  @column()
  declare subtotal: string

  @column()
  declare taxRate: string

  @column()
  declare taxAmount: string

  @column()
  declare total: string

  @column()
  declare currency: string

  @column()
  declare notes: string | null

  /** Relances envoyées au client (#878). */
  @column()
  declare reminderCount: number

  /** Dernier palier de relance traité, envoyé ou non (#878). */
  @column()
  declare lastReminderTier: number

  @column.dateTime()
  declare lastReminderAt: DateTime | null

  /** « Ne plus relancer » : client en litige (#878). */
  @column()
  declare remindersDisabled: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Client)
  declare client: BelongsTo<typeof Client>

  @belongsTo(() => BoatReservation, { foreignKey: 'reservationId' })
  declare reservation: BelongsTo<typeof BoatReservation>

  @hasMany(() => InvoiceLine)
  declare lines: HasMany<typeof InvoiceLine>

  @hasMany(() => InvoiceReminder)
  declare reminders: HasMany<typeof InvoiceReminder>
}
