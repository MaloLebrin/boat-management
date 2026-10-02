import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Boat from '#models/boat'
import Client from '#models/client'
import Invoice from '#models/invoice'
import Port from '#models/port'
import Spot from '#models/spot'
import type { MooringContractPeriodicity, MooringContractStatus } from '#shared/types/marina'

/**
 * Contrat d'amarrage d'un client sur une place (#891). `nextInvoiceOn` est la
 * prochaine échéance à facturer ; le job quotidien
 * `GenerateMooringContractInvoices` l'avance après chaque facture émise.
 */
export default class MooringContract extends BaseModel {
  static table = 'mooring_contracts'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number

  @column()
  declare portId: number

  @column()
  declare spotId: number

  @column()
  declare clientId: number | null

  @column()
  declare boatId: number | null

  @column.date()
  declare startsOn: DateTime

  @column.date()
  declare endsOn: DateTime | null

  @column()
  declare periodicity: MooringContractPeriodicity

  @column({ consume: (value: unknown) => Number(value) })
  declare amount: number

  @column.date()
  declare nextInvoiceOn: DateTime | null

  @column()
  declare status: MooringContractStatus

  @column()
  declare lastInvoiceId: number | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Port)
  declare port: BelongsTo<typeof Port>

  @belongsTo(() => Spot)
  declare spot: BelongsTo<typeof Spot>

  @belongsTo(() => Client)
  declare client: BelongsTo<typeof Client>

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @belongsTo(() => Invoice, { foreignKey: 'lastInvoiceId' })
  declare lastInvoice: BelongsTo<typeof Invoice>
}
