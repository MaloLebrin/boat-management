import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_engines'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.float('power_hp').nullable()
    })

    /**
     * Normalize existing values if any were stored using older enums
     */
    await this.db.rawQuery(`update ${this.tableName} set fuel = 'essence' where fuel = 'gasoline'`)
  }

  async down() {
    await this.db.rawQuery(`update ${this.tableName} set fuel = 'gasoline' where fuel = 'essence'`)

    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('power_hp')
    })
  }
}
