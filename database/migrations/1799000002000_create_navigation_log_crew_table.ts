import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'navigation_log_crew'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table
        .integer('navigation_log_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('navigation_logs')
        .onDelete('CASCADE')

      table
        .integer('crew_member_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('crew_members')
        .onDelete('CASCADE')

      table.enu('role', ['skipper', 'crew', 'passenger']).notNullable().defaultTo('crew')

      table.unique(['navigation_log_id', 'crew_member_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
