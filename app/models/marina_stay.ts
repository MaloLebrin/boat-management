import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Boat from '#models/boat'
import Client from '#models/client'
import Invoice from '#models/invoice'
import Port from '#models/port'
import Spot from '#models/spot'
import type { MarinaStayService, MarinaStayStatus } from '#shared/types/marina'

/**
 * Escale sur une place de la marina (#891) : un bateau de la flotte
 * (`boatId`) ou un visiteur décrit en ligne (`visitor*`). À ne pas confondre
 * avec `BoatPortStay`, dépense d'escale saisie par un plaisancier.
 */
export default class MarinaStay extends BaseModel {
  static table = 'marina_stays'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number

  @column()
  declare portId: number

  @column()
  declare spotId: number

  @column()
  declare boatId: number | null

  @column()
  declare clientId: number | null

  @column()
  declare visitorName: string | null

  @column({ consume: (value: unknown) => (value === null ? null : Number(value)) })
  declare visitorLengthM: number | null

  @column()
  declare visitorRegistration: string | null

  @column()
  declare visitorContact: string | null

  @column.date()
  declare arrivalOn: DateTime

  @column.date()
  declare departureOn: DateTime

  @column()
  declare status: MarinaStayStatus

  @column({ consume: (value: unknown) => Number(value) })
  declare nightlyRate: number

  @column({
    prepare: (value: unknown) => JSON.stringify(value ?? []),
    consume: (value: unknown) => (typeof value === 'string' ? JSON.parse(value) : (value ?? [])),
  })
  declare services: MarinaStayService[]

  @column()
  declare invoiceId: number | null

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

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @belongsTo(() => Client)
  declare client: BelongsTo<typeof Client>

  @belongsTo(() => Invoice)
  declare invoice: BelongsTo<typeof Invoice>
}
