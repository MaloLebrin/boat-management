import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Règle d'alerte rattachée à une batterie ou à une cuve (#1037) : le seuil
 * suit l'équipement (son `instrument_key`, sa suppression), pas seulement un
 * chemin saisi à la main.
 */
export default class extends BaseSchema {
  protected tableName = 'boat_instrument_alert_rules'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('battery_id').unsigned().nullable()
      table.foreign('battery_id').references('boat_batteries.id').onDelete('CASCADE')
      table.integer('tank_id').unsigned().nullable()
      table.foreign('tank_id').references('boat_tanks.id').onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['battery_id'])
      table.dropForeign(['tank_id'])
      table.dropColumn('battery_id')
      table.dropColumn('tank_id')
    })
  }
}
