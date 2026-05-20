import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('boats', (table) => {
      table
        .integer('spot_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('spots')
        .onDelete('SET NULL')
        .index()
    })

    this.schema.alterTable('boats', (table) => {
      table.dropForeign(['pontoon_id'])
      table.dropColumn('pontoon_id')
      table.dropForeign(['mouillage_id'])
      table.dropColumn('mouillage_id')
      table.dropColumn('spot_identifier')
    })
  }

  async down() {
    this.schema.alterTable('boats', (table) => {
      table
        .integer('pontoon_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('pontoons')
        .onDelete('SET NULL')
        .index()
      table
        .integer('mouillage_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('mouillages')
        .onDelete('SET NULL')
        .index()
      table.string('spot_identifier', 16).nullable()
    })

    this.schema.alterTable('boats', (table) => {
      table.dropForeign(['spot_id'])
      table.dropColumn('spot_id')
    })
  }
}
