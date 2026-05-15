import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('boat_engines', (table) => {
      table.string('status').notNullable().defaultTo('operational')
    })
    this.schema.alterTable('boat_sails', (table) => {
      table.string('status').notNullable().defaultTo('operational')
    })
    this.schema.alterTable('boat_rigs', (table) => {
      table.string('status').notNullable().defaultTo('operational')
    })
  }

  async down() {
    this.schema.alterTable('boat_engines', (table) => {
      table.dropColumn('status')
    })
    this.schema.alterTable('boat_sails', (table) => {
      table.dropColumn('status')
    })
    this.schema.alterTable('boat_rigs', (table) => {
      table.dropColumn('status')
    })
  }
}
