import EquipmentBrand from '#models/equipment_brand'
import type { GenericEquipmentCategory } from '#shared/types/boat'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

/**
 * Modèle du catalogue d'équipements (#577). Une marque peut couvrir plusieurs
 * catégories, un modèle une seule.
 */
export default class EquipmentModel extends BaseModel {
  static table = 'equipment_models'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare equipmentBrandId: number

  /** Unique au sein de la marque, stable à vie. */
  @column()
  declare slug: string

  /** Nom commercial officiel (`GPSMAP 923`, `IC-M330E`) — jamais traduit. */
  @column()
  declare name: string

  @column()
  declare category: GenericEquipmentCategory

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

  @belongsTo(() => EquipmentBrand)
  declare brand: BelongsTo<typeof EquipmentBrand>
}
