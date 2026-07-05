import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'pricing_seasons'

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
        .integer('boat_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('boats')
        .onDelete('CASCADE')

      table.string('name').notNullable()
      table.date('starts_on').notNullable()
      table.date('ends_on').notNullable()
      table.decimal('daily_price', 10, 2).nullable()
      table.decimal('multiplier', 6, 3).nullable()
      table.integer('priority').notNullable().defaultTo(0)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['organization_id', 'boat_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
