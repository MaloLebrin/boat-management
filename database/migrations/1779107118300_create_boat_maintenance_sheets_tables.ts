import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('boat_maintenance_sheets', (table) => {
      table.increments('id')
      table
        .integer('boat_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('boats')
        .onDelete('CASCADE')
      table
        .enum('type', ['entretien', 'montage', 'hivernage', 'dehivernage', 'atelier'])
        .notNullable()
      table.string('title', 200).notNullable()
      table
        .enum('status', ['in_progress', 'completed'])
        .notNullable()
        .defaultTo('in_progress')
      table.date('performed_at').notNullable()
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('boat_maintenance_sheet_items', (table) => {
      table.increments('id')
      table
        .integer('boat_maintenance_sheet_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('boat_maintenance_sheets')
        .onDelete('CASCADE')
      table.string('label', 300).notNullable()
      table.boolean('is_done').notNullable().defaultTo(false)
      table.text('notes').nullable()
      table.integer('position').notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTableIfExists('boat_maintenance_sheet_items')
    this.schema.dropTableIfExists('boat_maintenance_sheets')
  }
}
