import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boats'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('propulsion_type').nullable().index()

      table.float('length_m').nullable()
      table.float('beam_m').nullable()
      table.float('draft_m').nullable()
      table.float('mast_height_m').nullable()

      table.string('hull_material').nullable().index()
      table.integer('year_built').nullable()
      table.string('manufacturer').nullable()
      table.string('model').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('propulsion_type')
      table.dropColumn('length_m')
      table.dropColumn('beam_m')
      table.dropColumn('draft_m')
      table.dropColumn('mast_height_m')
      table.dropColumn('hull_material')
      table.dropColumn('year_built')
      table.dropColumn('manufacturer')
      table.dropColumn('model')
    })
  }
}
