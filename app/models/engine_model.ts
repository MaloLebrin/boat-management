import EngineBrand from '#models/engine_brand'
import type { EngineFuel } from '#shared/constants/boats/boat_form_options'
import type { EngineCatalogFamily, EngineStrokeType } from '#shared/types/engine_catalog'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

/**
 * Modèle du catalogue moteur (#573). Une marque peut couvrir plusieurs
 * familles, un modèle une seule.
 */
export default class EngineModel extends BaseModel {
  static table = 'engine_models'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare engineBrandId: number

  /** Unique au sein de la marque, stable à vie. */
  @column()
  declare slug: string

  /** Nom commercial officiel (`F150 XCA`, `D2-40`) — jamais traduit. */
  @column()
  declare name: string

  /** Code de la plaque signalétique, jamais une reconstitution. */
  @column()
  declare modelCode: string | null

  @column()
  declare family: EngineCatalogFamily

  @column({ consume: (value: unknown) => (value === null ? null : Number(value)) })
  declare powerHp: number | null

  @column()
  declare displacementCc: number | null

  @column()
  declare cylinders: number | null

  @column()
  declare strokeType: EngineStrokeType | null

  @column()
  declare fuel: EngineFuel | null

  @column()
  declare productionStartYear: number | null

  /** Renseigné pour les gammes discontinuées, quand la date est certaine. */
  @column()
  declare productionEndYear: number | null

  @column({
    prepare: (value: unknown) =>
      value === null || value === undefined ? value : JSON.stringify(value),
    consume: (value: unknown) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare aliases: string[] | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => EngineBrand)
  declare brand: BelongsTo<typeof EngineBrand>
}
