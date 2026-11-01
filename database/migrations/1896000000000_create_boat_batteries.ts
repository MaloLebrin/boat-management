import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Batteries d'un bateau (#1037). `instrument_key` (`<id>` de
 * `electrical.batteries.<id>.*`) est unique par bateau : deux batteries sous la
 * même clé se partageraient les mêmes jauges. `low_voltage_v` est le seuil
 * d'alerte propre à la batterie (règle liée dans `boat_instrument_alert_rules`).
 */
export default class extends BaseSchema {
  protected tableName = 'boat_batteries'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('boat_id').unsigned().notNullable()
      table.foreign('boat_id').references('boats.id').onDelete('CASCADE')
      table.string('name', 120).notNullable()
      table.string('instrument_key', 40).nullable()
      table.string('chemistry', 16).nullable()
      table.integer('capacity_ah').nullable()
      table.decimal('nominal_voltage', 5, 1).nullable()
      table.decimal('low_voltage_v', 5, 2).nullable()
      table.integer('position').notNullable().defaultTo(0)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['boat_id', 'instrument_key'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
