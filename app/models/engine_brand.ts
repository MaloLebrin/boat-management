import EngineModel from '#models/engine_model'
import type { EngineCatalogFamily } from '#shared/types/engine_catalog'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

/**
 * Marque du catalogue moteur (#573) — référentiel global, sans organisation.
 *
 * Comme `BoatBrand` (#571), ce modèle n'étend pas la classe générée de
 * `database/schema.ts` : les colonnes `jsonb` ont besoin de `prepare`/`consume`.
 */
export default class EngineBrand extends BaseModel {
  static table = 'engine_brands'

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

  @column({
    prepare: (value: unknown) =>
      value === null || value === undefined ? value : JSON.stringify(value),
    consume: (value: unknown) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare families: EngineCatalogFamily[]

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

  @hasMany(() => EngineModel)
  declare models: HasMany<typeof EngineModel>
}
