import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'pontoons'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.double('position_x').nullable()
      table.double('position_y').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('position_x')
      table.dropColumn('position_y')
    })
  }
}
