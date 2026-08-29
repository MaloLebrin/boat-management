import BoatBrand from '#models/boat_brand'
import type { BoatCategory } from '#shared/types/boat_catalog'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

/**
 * Modèle (gamme) du catalogue de bateaux (#571). Une marque peut couvrir
 * plusieurs catégories, un modèle une seule.
 */
export default class BoatModel extends BaseModel {
  static table = 'boat_models'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare boatBrandId: number

  /** Unique au sein de la marque, stable à vie. */
  @column()
  declare slug: string

  /** Nom commercial officiel (`Oceanis 46.1`) — jamais traduit. */
  @column()
  declare name: string

  @column()
  declare category: BoatCategory

  @column()
  declare lengthM: number | null

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

  @belongsTo(() => BoatBrand)
  declare brand: BelongsTo<typeof BoatBrand>
}
