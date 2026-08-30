import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Modèles du catalogue d'équipements (#577). Un modèle appartient à une marque
 * et à une seule catégorie. Le corpus se concentre sur l'électronique, là où le
 * modèle précis compte pour le SAV et les mises à jour.
 */
export default class extends BaseSchema {
  protected tableName = 'equipment_models'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('equipment_brand_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('equipment_brands')
        .onDelete('CASCADE')
      table.string('slug', 160).notNullable()
      table.string('name', 200).notNullable()
      table.string('category', 40).notNullable()
      // Gammes discontinuées conservées : un Autohelm des années 90 doit
      // trouver son modèle. Renseignées seulement quand la date est certaine.
      table.integer('production_start_year').nullable()
      table.integer('production_end_year').nullable()
      table.jsonb('aliases').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['equipment_brand_id', 'slug'])
      table.index('category')
      table.index('name')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
