import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_engine_repair_cart_items'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('boat_engine_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('boat_engines')
        .onDelete('CASCADE')
      // Clé stable d'une pièce du catalogue (`<ensemble>.<slug>`), définie dans
      // shared/constants/spare_parts/spare_parts_content.ts.
      table.string('part_key', 64).notNullable()
      table.integer('quantity').notNullable().defaultTo(1)
      // Référence constructeur relevée par l'utilisateur sur la vue éclatée.
      table.string('reference', 64).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['boat_engine_id', 'part_key'], { indexName: 'berci_engine_part_unique' })
      table.index(['boat_engine_id'], 'berci_engine_index')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
