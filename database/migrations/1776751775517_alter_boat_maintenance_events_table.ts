import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_maintenance_events'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.date('due_at').nullable().index()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('due_at')
    })
  }
}
