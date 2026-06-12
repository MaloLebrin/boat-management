import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'simulator_leads'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('wintering_zone', 20).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('wintering_zone')
    })
  }
}
