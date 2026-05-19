import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('ports', (table) => {
      table.increments('id').notNullable()
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
        .index()
      table.string('name', 120).notNullable()
      table.string('city', 120).nullable()
      table.string('country', 8).nullable()
      table.text('address').nullable()
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable('ports')
  }
}
