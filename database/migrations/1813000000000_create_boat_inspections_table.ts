import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_inspections'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table
        .integer('reservation_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('boat_reservations')
        .onDelete('CASCADE')

      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')

      table.string('kind').notNullable()
      table.timestamp('performed_at').notNullable()
      table.integer('fuel_level').nullable()
      table.decimal('engine_hours', 6, 2).nullable()
      table.text('notes').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['reservation_id', 'kind'])
    })

    this.schema.raw(`
      ALTER TABLE "${this.tableName}"
      ADD CONSTRAINT "${this.tableName}_kind_check"
      CHECK (kind IN ('checkout','checkin'))
    `)
  }

  async down() {
    this.schema.raw(
      `ALTER TABLE "${this.tableName}" DROP CONSTRAINT IF EXISTS "${this.tableName}_kind_check"`
    )
    this.schema.dropTable(this.tableName)
  }
}
