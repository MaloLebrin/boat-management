import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'organizations'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Business profile declared at signup (issue #448). Both are nullable:
      // the two selects are optional, and every organization created before
      // this migration has no answer to backfill from.
      table.string('type', 32).nullable()
      table.string('fleet_size', 16).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('type')
      table.dropColumn('fleet_size')
    })
  }
}
