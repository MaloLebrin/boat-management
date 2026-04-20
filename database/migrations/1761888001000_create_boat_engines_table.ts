import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_engines'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table.integer('boat_id').unsigned().notNullable().index()

      table.string('kind').notNullable()
      table.string('fuel').nullable()

      table.string('brand').nullable()
      table.string('model').nullable()
      table.string('serial_number').nullable()

      table.float('power_kw').nullable()
      table.integer('hours').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
