import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      /**
       * SQLite ALTER TABLE limitations make adding a FK constraint brittle.
       * We enforce organization scoping at the application layer for now.
       */
      table.integer('organization_id').unsigned().nullable().index()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('organization_id')
    })
  }
}
