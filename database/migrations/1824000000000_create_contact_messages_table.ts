import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contact_messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.string('subject', 32).notNullable()
      table.string('first_name', 100).notNullable()
      table.string('last_name', 100).notNullable()
      table.string('email', 254).notNullable()
      table.string('organization', 255).nullable()
      table.string('fleet_size', 16).nullable()
      table.text('message').notNullable()
      table.string('locale', 10).notNullable().defaultTo('fr')
      table.string('ip_address', 45).nullable()
      table.timestamp('created_at').notNullable()

      table.index(['email'], 'contact_messages_email_index')
      table.index(['created_at'], 'contact_messages_created_at_index')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
