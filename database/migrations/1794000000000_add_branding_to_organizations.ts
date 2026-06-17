import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'organizations'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('logo_url').nullable()
      table.string('logo_public_id').nullable()
      table.string('primary_color', 7).nullable()
      table.string('secondary_color', 7).nullable()
      table.string('app_name').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('logo_url')
      table.dropColumn('logo_public_id')
      table.dropColumn('primary_color')
      table.dropColumn('secondary_color')
      table.dropColumn('app_name')
    })
  }
}
