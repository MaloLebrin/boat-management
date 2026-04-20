import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_sails'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.renameColumn('area_m2', 'area_m_2')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.renameColumn('area_m_2', 'area_m2')
    })
  }
}
