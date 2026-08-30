import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Catalogue de marques d'équipements génériques (#577), miroir de
 * `engine_brands` (#573). Table globale, non rattachée à une organisation :
 * c'est un référentiel alimenté par `equipment_catalog_seeder`, jamais par les
 * utilisateurs.
 */
export default class extends BaseSchema {
  protected tableName = 'equipment_brands'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      // Identifiant stable à vie — jamais renommé, même si `name` évolue.
      table.string('slug', 120).notNullable().unique()
      table.string('name', 160).notNullable()
      table.string('country', 8).nullable()
      // Une marque couvre souvent plusieurs catégories (Lewmar : mouillage et
      // accastillage, Plastimo : mouillage et confort) — d'où le tableau.
      table.jsonb('categories').notNullable()
      // Orthographes et anciens noms réellement rencontrés en saisie libre
      // (`waeco`, `autohelm`, `indel`), utilisés par
      // `EquipmentCatalogService.resolveBrand()`.
      table.jsonb('aliases').nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.index('name')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
