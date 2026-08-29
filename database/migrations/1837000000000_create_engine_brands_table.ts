import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Catalogue de marques de motorisation (#573), miroir de `boat_brands` (#571).
 * Table globale, non rattachée à une organisation : c'est un référentiel
 * alimenté par `engine_catalog_seeder`, jamais par les utilisateurs.
 */
export default class extends BaseSchema {
  protected tableName = 'engine_brands'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      // Identifiant stable à vie — jamais renommé, même si `name` évolue.
      table.string('slug', 120).notNullable().unique()
      table.string('name', 160).notNullable()
      table.string('country', 8).nullable()
      // Un motoriste couvre souvent plusieurs familles (Volvo Penta : in-bord
      // diesel et in-bord essence) — d'où le tableau plutôt qu'une colonne.
      table.jsonb('families').notNullable()
      // Orthographes et anciens noms réellement rencontrés en saisie libre
      // (`volvo`, `volvo penta`, `VP`), utilisés par
      // `EngineCatalogService.resolveBrand()`.
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
