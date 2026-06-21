import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notifications'

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
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')

      table.string('type', 100).notNullable()
      table.string('severity', 20).notNullable().defaultTo('info')
      table.string('title', 500).notNullable()
      table.text('body').nullable()
      table.string('action_url', 1000).nullable()
      table.json('metadata').nullable()
      table.timestamp('read_at').nullable()

      table.timestamp('created_at').notNullable()

      table.index(['user_id', 'read_at'])
      table.index(['organization_id', 'created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
