import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('boat_maintenance_events', (table) => {
      table.increments('id').notNullable()
      table
        .integer('boat_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('boats')
        .onDelete('CASCADE')
      table.string('subject').notNullable().index()
      table
        .integer('boat_engine_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('boat_engines')
        .onDelete('SET NULL')
      table
        .integer('boat_sail_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('boat_sails')
        .onDelete('SET NULL')
      table
        .integer('boat_rig_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('boat_rigs')
        .onDelete('SET NULL')
      table.string('engine_caption').nullable()
      table.string('sail_caption').nullable()
      table.date('performed_at').notNullable()
      table.string('title').notNullable()
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('boat_maintenance_parts', (table) => {
      table.increments('id').notNullable()
      table
        .integer('maintenance_event_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('boat_maintenance_events')
        .onDelete('CASCADE')
      table.string('name').notNullable()
      table.integer('quantity').unsigned().nullable()
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable('boat_maintenance_parts')
    this.schema.dropTable('boat_maintenance_events')
  }
}
