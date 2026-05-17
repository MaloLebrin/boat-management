import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('boat_engines', (table) => {
      table.text('notes').nullable()
    })
    this.schema.alterTable('boat_sails', (table) => {
      table.text('notes').nullable()
    })
    this.schema.alterTable('boat_rigs', (table) => {
      table.text('notes').nullable()
    })
  }

  async down() {
    this.schema.alterTable('boat_engines', (table) => {
      table.dropColumn('notes')
    })
    this.schema.alterTable('boat_sails', (table) => {
      table.dropColumn('notes')
    })
    this.schema.alterTable('boat_rigs', (table) => {
      table.dropColumn('notes')
    })
  }
}
