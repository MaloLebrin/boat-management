import EngineModel from '#models/engine_model'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

/**
 * Référence constructeur rattachée à un couple (modèle moteur, pièce) — #575.
 *
 * `sourceLabel` n'est pas nullable, en base comme ici : une référence sans
 * source ne peut pas entrer en base, donc ne peut pas s'afficher. C'est le
 * critère d'acceptation de #517 traduit en contrainte de schéma.
 */
export default class EnginePartReference extends BaseModel {
  static table = 'engine_part_references'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare engineModelId: number

  /** Clé du catalogue de pièces (`lower-unit.impeller`) — jamais renommée. */
  @column()
  declare partKey: string

  @column()
  declare reference: string

  /** D'où vient la référence — obligatoire, voir le commentaire de tête. */
  @column()
  declare sourceLabel: string

  @column()
  declare sourceUrl: string | null

  /** Dernière vérification ; `null` = jamais revérifiée, signalé à l'écran. */
  @column.date()
  declare verifiedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => EngineModel)
  declare engineModel: BelongsTo<typeof EngineModel>
}
