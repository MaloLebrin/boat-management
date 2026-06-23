import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('boats', (table) => {
      table.string('mmsi', 9).nullable()
      table.string('imo_number', 20).nullable()
    })
  }

  async down() {
    this.schema.alterTable('boats', (table) => {
      table.dropColumn('mmsi')
      table.dropColumn('imo_number')
    })
  }
}
