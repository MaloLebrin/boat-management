import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'navigation_log_entries'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table
        .integer('navigation_log_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('navigation_logs')
        .onDelete('CASCADE')

      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')

      table.dateTime('recorded_at').notNullable()

      // Nullable : un point peut être saisi sans fix GPS (géoloc refusée / indisponible).
      table.decimal('latitude', 9, 6).nullable()
      table.decimal('longitude', 10, 6).nullable()
      table.decimal('gps_accuracy_m', 7, 1).nullable()

      // COG null quand la vitesse est quasi nulle (au mouillage, le cap n'a pas de sens).
      table.integer('cog_deg').nullable()
      table.decimal('sog_kn', 5, 2).nullable()

      table.string('sail_config', 255).nullable()
      table.text('note').nullable()

      // Réservées pour l'itération météo (cache GRIB offline) — non écrites aujourd'hui.
      table.integer('twd_deg').nullable()
      table.integer('twa_deg').nullable()
      table.jsonb('weather_snapshot').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['navigation_log_id', 'recorded_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
