import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('boats', (table) => {
      table.date('manufactured_at').nullable()
    })

    this.schema.alterTable('boat_engines', (table) => {
      table.date('manufactured_at').nullable()
    })

    this.schema.alterTable('boat_sails', (table) => {
      table.date('manufactured_at').nullable()
    })

    this.schema.alterTable('boat_rigs', (table) => {
      table.date('manufactured_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable('boat_rigs', (table) => {
      table.dropColumn('manufactured_at')
    })

    this.schema.alterTable('boat_sails', (table) => {
      table.dropColumn('manufactured_at')
    })

    this.schema.alterTable('boat_engines', (table) => {
      table.dropColumn('manufactured_at')
    })

    this.schema.alterTable('boats', (table) => {
      table.dropColumn('manufactured_at')
    })
  }
}
