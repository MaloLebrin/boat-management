import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_maintenance_tasks'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
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

      table.string('title').notNullable()
      table.text('notes').nullable()

      table.string('status').notNullable().defaultTo('open').index()
      table.date('done_at').nullable()

      table.date('due_at').nullable().index()
      table.integer('recurrence_interval_months').unsigned().nullable()

      table.integer('due_engine_hours').unsigned().nullable().index()
      table.integer('recurrence_interval_engine_hours').unsigned().nullable()
      table.integer('last_done_engine_hours').unsigned().nullable()
      table.integer('done_engine_hours').unsigned().nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    // SQLite-friendly check constraints to keep the domain consistent
    this.schema.raw(`
      ALTER TABLE "${this.tableName}"
      ADD CONSTRAINT "${this.tableName}_status_check"
      CHECK (status IN ('open','done'))
    `)
  }

  async down() {
    this.schema.raw(
      `ALTER TABLE "${this.tableName}" DROP CONSTRAINT IF EXISTS "${this.tableName}_status_check"`
    )
    this.schema.dropTable(this.tableName)
  }
}
