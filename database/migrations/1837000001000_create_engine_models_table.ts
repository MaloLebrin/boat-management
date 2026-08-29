import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Modèles du catalogue moteur (#573). Un modèle appartient à une marque et à
 * une seule famille.
 *
 * `model_code` est le code de la **plaque signalétique** (`6E0`, `J50PLEA`,
 * `D2-40`) — celui que l'identification des pièces détachées (#517) exploite
 * déjà en le devinant. Il n'est jamais reconstitué : à défaut de certitude, la
 * colonne reste vide.
 */
export default class extends BaseSchema {
  protected tableName = 'engine_models'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('engine_brand_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('engine_brands')
        .onDelete('CASCADE')
      table.string('slug', 160).notNullable()
      table.string('name', 200).notNullable()
      table.string('model_code', 60).nullable()
      table.string('family', 40).notNullable()
      table.decimal('power_hp', 7, 1).nullable()
      table.integer('displacement_cc').nullable()
      table.integer('cylinders').nullable()
      table.string('stroke_type', 16).nullable()
      table.string('fuel', 32).nullable()
      // Gammes discontinuées conservées : un Yamaha 4AS de 1998 doit trouver
      // son modèle. Renseignées seulement quand la date est certaine.
      table.integer('production_start_year').nullable()
      table.integer('production_end_year').nullable()
      table.jsonb('aliases').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['engine_brand_id', 'slug'])
      table.index('family')
      table.index('name')
      table.index('model_code')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
