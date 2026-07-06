import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'rental_contracts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')

      table
        .integer('reservation_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('id')
        .inTable('boat_reservations')
        .onDelete('CASCADE')

      table
        .integer('client_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('clients')
        .onDelete('SET NULL')

      table.string('status').notNullable().defaultTo('draft')
      table.timestamp('signed_at').nullable()

      // Reserved for #291 (signed contract upload) — not exploited in this lot.
      table
        .integer('media_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('media')
        .onDelete('SET NULL')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.raw(`
      ALTER TABLE "${this.tableName}"
      ADD CONSTRAINT "${this.tableName}_status_check"
      CHECK (status IN ('draft','sent','signed'))
    `)
  }

  async down() {
    this.schema.raw(
      `ALTER TABLE "${this.tableName}" DROP CONSTRAINT IF EXISTS "${this.tableName}_status_check"`
    )
    this.schema.dropTable(this.tableName)
  }
}
