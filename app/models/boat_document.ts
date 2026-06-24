import Boat from '#models/boat'
import Media from '#models/media'
import type { BoatDocumentType } from '#shared/types/boat_document'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class BoatDocument extends BaseModel {
  static table = 'boat_documents'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare boatId: number

  @column()
  declare organizationId: number

  @column()
  declare type: BoatDocumentType

  @column()
  declare customTypeLabel: string | null

  @column()
  declare referenceNumber: string | null

  @column.date()
  declare issuedAt: DateTime | null

  @column.date()
  declare expiresAt: DateTime | null

  @column()
  declare issuer: string | null

  @column()
  declare mediaId: number | null

  @column()
  declare notes: string | null

  @column()
  declare cost: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @belongsTo(() => Media)
  declare media: BelongsTo<typeof Media>
}
