import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('boats', (table) => {
      table
        .integer('pontoon_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('pontoons')
        .onDelete('SET NULL')
      table.string('spot_identifier', 16).nullable()
    })
  }

  async down() {
    this.schema.alterTable('boats', (table) => {
      table.dropColumn('pontoon_id')
      table.dropColumn('spot_identifier')
    })
  }
}
