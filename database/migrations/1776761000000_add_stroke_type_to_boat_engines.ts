import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_engines'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('stroke_type', 16).nullable().defaultTo(null)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('stroke_type')
    })
  }
}
