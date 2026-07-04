import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'clients'

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

      table.string('first_name').notNullable()
      table.string('last_name').notNullable()
      table.string('email').nullable()
      table.string('phone').nullable()
      table.text('address').nullable()
      table.string('navigation_permit_number').nullable()
      table.string('navigation_permit_type').nullable()

      table.enu('status', ['active', 'inactive', 'blacklisted']).notNullable().defaultTo('active')

      table.text('notes').nullable()
      table.timestamp('gdpr_consent_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['organization_id', 'email'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
