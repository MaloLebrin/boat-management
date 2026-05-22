import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'organization_invitations'

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
        .integer('invited_by_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.string('email').notNullable()
      table.enu('role', ['admin', 'member']).notNullable().defaultTo('member')
      table.string('token').notNullable().unique()
      table.enu('status', ['pending', 'accepted', 'cancelled']).notNullable().defaultTo('pending')
      table.timestamp('expires_at').notNullable()
      table.timestamp('accepted_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['organization_id'])
      table.index(['email'])
      table.index(['token'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
