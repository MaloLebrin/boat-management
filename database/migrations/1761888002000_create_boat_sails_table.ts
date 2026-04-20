import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_sails'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table.integer('boat_id').unsigned().notNullable().index()

      table.string('sail_type').notNullable()
      table.float('area_m2').nullable()
      table.string('material').nullable()
      table.integer('reef_points').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
