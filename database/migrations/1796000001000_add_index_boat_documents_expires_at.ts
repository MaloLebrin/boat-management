import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_documents'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.index(['expires_at'], 'boat_documents_expires_at_index')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['expires_at'], 'boat_documents_expires_at_index')
    })
  }
}
