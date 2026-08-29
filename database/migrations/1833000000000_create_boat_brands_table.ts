import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Catalogue de marques de bateau (#571). Table globale, non rattachée à une
 * organisation : c'est un référentiel alimenté par `boat_catalog_seeder`.
 */
export default class extends BaseSchema {
  protected tableName = 'boat_brands'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      // Identifiant stable à vie — jamais renommé, même si `name` évolue.
      table.string('slug', 120).notNullable().unique()
      table.string('name', 160).notNullable()
      table.string('country', 8).nullable()
      // Une marque peut couvrir plusieurs catégories (Bénéteau : voilier,
      // vedette et trawler) — d'où le tableau plutôt qu'une colonne simple.
      table.jsonb('categories').notNullable()
      // Orthographes et anciens noms réellement rencontrés en saisie libre,
      // utilisés par `BoatCatalogService.resolveBrand()`.
      table.jsonb('aliases').nullable()
      table.integer('founded_year').nullable()
      table.integer('discontinued_year').nullable()
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
