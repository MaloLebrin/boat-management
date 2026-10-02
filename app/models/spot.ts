import { BaseModel, belongsTo, column, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasOne } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Boat from '#models/boat'
import Mouillage from '#models/mouillage'
import Organization from '#models/organization'
import Pontoon from '#models/pontoon'
import type { SpotKind, SpotStatus } from '#shared/types/spot'

/** Les colonnes `decimal` reviennent de Postgres en chaîne. */
const decimalColumn = {
  consume: (value: unknown) => (value === null || value === undefined ? null : Number(value)),
}

export default class Spot extends BaseModel {
  static table = 'spots'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare pontoonId: number | null

  @column()
  declare mouillageId: number | null

  @column()
  declare organizationId: number

  /** Dimensions maximales accueillies (#891), en mètres. */
  @column(decimalColumn)
  declare lengthM: number | null

  @column(decimalColumn)
  declare beamM: number | null

  @column(decimalColumn)
  declare draftM: number | null

  @column()
  declare kind: SpotKind

  /** Statut saisi — « occupée » se déduit, voir `spotEffectiveStatus`. */
  @column()
  declare status: SpotStatus

  @column(decimalColumn)
  declare dailyRate: number | null

  @column(decimalColumn)
  declare monthlyRate: number | null

  @column(decimalColumn)
  declare annualRate: number | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Pontoon)
  declare pontoon: BelongsTo<typeof Pontoon>

  @belongsTo(() => Mouillage)
  declare mouillage: BelongsTo<typeof Mouillage>

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @hasOne(() => Boat)
  declare boat: HasOne<typeof Boat>
}
