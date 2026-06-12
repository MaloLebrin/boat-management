import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'simulator_shares'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.string('token', 12).notNullable().unique()
      table.jsonb('input').notNullable()
      table.jsonb('breakdown').notNullable()
      table.string('locale', 10).notNullable().defaultTo('fr')
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
