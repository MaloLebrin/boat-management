import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Inventaire des appareils du bus remonté par la boîte (#1036). Un appareil
 * est identifié par `device_id` (empreinte posée par le plugin) au sein d'une
 * source ; `gone_at` est posé quand il n'est plus annoncé, effacé s'il revient.
 */
export default class extends BaseSchema {
  protected tableName = 'boat_instrument_devices'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('source_id').unsigned().notNullable()
      table.foreign('source_id').references('boat_instrument_sources.id').onDelete('CASCADE')
      table.string('device_id', 64).notNullable()
      table.string('label', 120).notNullable()
      table.string('manufacturer', 120).nullable()
      table.string('model', 120).nullable()
      table.string('serial_number', 120).nullable()
      table.string('function', 120).nullable()
      table.string('bus', 12).notNullable()
      table.integer('address').nullable()
      table.jsonb('paths').notNullable().defaultTo('[]')
      table.timestamp('first_seen_at', { useTz: true }).notNullable()
      table.timestamp('last_seen_at', { useTz: true }).notNullable()
      table.timestamp('gone_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['source_id', 'device_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
