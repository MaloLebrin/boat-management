import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ai_token_usages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
      table.string('month', 7).notNullable()
      table.bigInteger('tokens_used').unsigned().notNullable().defaultTo(0)
      table.timestamps(true)
      table.unique(['organization_id', 'month'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
