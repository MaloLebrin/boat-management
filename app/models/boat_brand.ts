import BoatModel from '#models/boat_model'
import type { BoatCategory } from '#shared/types/boat_catalog'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

/** Marque du catalogue de bateaux (#571) — référentiel global, sans organisation. */
export default class BoatBrand extends BaseModel {
  static table = 'boat_brands'

  @column({ isPrimary: true })
  declare id: number

  /** Identifiant stable à vie — jamais renommé. */
  @column()
  declare slug: string

  /** Nom commercial officiel, accents et casse compris — jamais traduit. */
  @column()
  declare name: string

  @column()
  declare country: string | null

  @column({
    prepare: (value: unknown) =>
      value === null || value === undefined ? value : JSON.stringify(value),
    consume: (value: unknown) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare categories: BoatCategory[]

  /** Orthographes et anciens noms rencontrés en saisie libre. */
  @column({
    prepare: (value: unknown) =>
      value === null || value === undefined ? value : JSON.stringify(value),
    consume: (value: unknown) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare aliases: string[] | null

  @column()
  declare foundedYear: number | null

  @column()
  declare discontinuedYear: number | null

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => BoatModel)
  declare models: HasMany<typeof BoatModel>
}
