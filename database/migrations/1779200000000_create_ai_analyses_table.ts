import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ai_analyses'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('boat_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('boats')
        .onDelete('CASCADE')
      table.enum('kind', ['fleet_analysis', 'boat_suggestions']).notNullable()
      table.text('response_text').notNullable()
      table.timestamp('created_at').notNullable()
      table.index(['user_id', 'kind', 'boat_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
