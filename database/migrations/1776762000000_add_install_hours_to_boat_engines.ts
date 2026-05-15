import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_engines'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('install_hours').nullable().defaultTo(null)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('install_hours')
    })
  }
}
