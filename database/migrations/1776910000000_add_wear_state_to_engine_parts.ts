import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('boat_engine_parts', (table) => {
      table.string('wear_state', 30).nullable().defaultTo('good')
    })
  }

  async down() {
    this.schema.alterTable('boat_engine_parts', (table) => {
      table.dropColumn('wear_state')
    })
  }
}
