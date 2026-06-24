import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_documents'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.decimal('cost', 10, 2).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('cost')
    })
  }
}
