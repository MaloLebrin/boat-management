import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'simulator_leads'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.string('email', 254).notNullable().unique()
      table.string('boat_type').notNullable()
      table.integer('length_m').notNullable()
      table.string('hull_wear').nullable()
      table.string('engine_wear').nullable()
      table.string('safety_wear').nullable()
      table.string('rigging_wear').nullable()
      table.integer('total_min').notNullable()
      table.integer('total_max').notNullable()
      table.string('locale', 10).notNullable().defaultTo('fr')
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
