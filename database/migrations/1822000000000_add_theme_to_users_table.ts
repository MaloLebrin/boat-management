import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Persisted theme preference (issue #416): 'system' | 'light' | 'dark'.
      // Nullable: falls back to the cookie, then to 'system' when unset.
      table.string('theme', 10).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('theme')
    })
  }
}
