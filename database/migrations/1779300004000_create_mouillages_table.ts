import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('mouillages', (table) => {
      table.increments('id').notNullable()
      table
        .integer('port_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('ports')
        .onDelete('CASCADE')
        .index()
      table.string('name', 120).notNullable()
      table.text('description').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable('mouillages')
  }
}
