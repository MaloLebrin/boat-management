import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'crew_certifications'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table
        .integer('crew_member_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('crew_members')
        .onDelete('CASCADE')

      table
        .enu('type', [
          'coastal_permit',
          'offshore_permit',
          'vhf',
          'stcw_basic',
          'stcw_proficiency',
          'other',
        ])
        .notNullable()

      table.string('reference_number').nullable()
      table.date('expires_at').nullable().index()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
