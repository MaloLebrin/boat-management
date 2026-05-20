import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('spots', (table) => {
      table.increments('id').notNullable()
      table.string('name', 100).notNullable()
      table.text('description').nullable()
      table
        .integer('pontoon_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('pontoons')
        .onDelete('CASCADE')
        .index()
      table
        .integer('mouillage_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('mouillages')
        .onDelete('CASCADE')
        .index()
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
        .index()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable('spots')
  }
}
