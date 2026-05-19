import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('boats', (table) => {
      table
        .integer('mouillage_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('mouillages')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable('boats', (table) => {
      table.dropColumn('mouillage_id')
    })
  }
}
