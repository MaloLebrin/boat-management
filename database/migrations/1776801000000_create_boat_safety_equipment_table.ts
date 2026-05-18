import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('boat_safety_equipment', (table) => {
      table.increments('id').notNullable()
      table
        .integer('boat_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('boats')
        .onDelete('CASCADE')
      table.string('equipment_type').notNullable()
      table.integer('quantity').unsigned().nullable()
      table.date('expiry_date').nullable()
      table.string('status').notNullable().defaultTo('ok')
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable('boat_safety_equipment')
  }
}
