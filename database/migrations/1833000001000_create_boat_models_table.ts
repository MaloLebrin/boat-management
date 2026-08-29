import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Modèles du catalogue (#571). Un modèle appartient à une marque et à une
 * seule catégorie — c'est la gamme (`Oceanis 46.1`, `Merry Fisher 795`), pas la
 * fiche technique : dimensions et motorisation sont hors périmètre v1.
 */
export default class extends BaseSchema {
  protected tableName = 'boat_models'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('boat_brand_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('boat_brands')
        .onDelete('CASCADE')
      table.string('slug', 160).notNullable()
      table.string('name', 200).notNullable()
      table.string('category', 40).notNullable()
      table.decimal('length_m', 6, 2).nullable()
      // Gammes discontinuées conservées : un bateau de 1987 doit trouver son
      // modèle. Renseignés seulement quand la date est certaine.
      table.integer('production_start_year').nullable()
      table.integer('production_end_year').nullable()
      table.jsonb('aliases').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['boat_brand_id', 'slug'])
      table.index('category')
      table.index('name')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
