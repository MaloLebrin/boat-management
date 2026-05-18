import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('boats', (table) => {
      table.string('home_port').nullable()
      table.string('navigation_category').nullable()
      table.string('hull_identification_number').nullable()
      table.string('francisation_number').nullable()
      table.string('flag_country').nullable()
      table.integer('max_persons').unsigned().nullable()
    })
  }

  async down() {
    this.schema.alterTable('boats', (table) => {
      table.dropColumn('home_port')
      table.dropColumn('navigation_category')
      table.dropColumn('hull_identification_number')
      table.dropColumn('francisation_number')
      table.dropColumn('flag_country')
      table.dropColumn('max_persons')
    })
  }
}
