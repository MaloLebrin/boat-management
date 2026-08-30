import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

/**
 * Voilerie du référentiel (#578) — référentiel global, sans organisation.
 *
 * Comme `EngineBrand` (#573) et `EquipmentBrand` (#577), ce modèle n'étend pas
 * la classe générée de `database/schema.ts` : la colonne `jsonb` a besoin de
 * `prepare`/`consume`. Pas de modèles associés — une voile est un produit sur
 * mesure, le référentiel s'arrête à la voilerie.
 */
export default class SailLoft extends BaseModel {
  static table = 'sail_lofts'

  @column({ isPrimary: true })
  declare id: number

  /** Identifiant stable à vie — jamais renommé. */
  @column()
  declare slug: string

  /** Nom commercial officiel, casse et accents compris — jamais traduit. */
  @column()
  declare name: string

  @column()
  declare country: string | null

  /** Orthographes et anciens noms rencontrés en saisie libre. */
  @column({
    prepare: (value: unknown) =>
      value === null || value === undefined ? value : JSON.stringify(value),
    consume: (value: unknown) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare aliases: string[] | null

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
