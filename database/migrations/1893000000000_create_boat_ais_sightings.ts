import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Cibles AIS relevées par les instruments (#1009, épopée #986). Un relevé par
 * cible et par fenêtre d'agrégation du client ; les cibles sont d'autres
 * navires (MMSI, nom, position) : donnée de tiers à rétention courte, purgée
 * par `TelemetryRetentionService`. L'unicité `(source_id, mmsi, recorded_at)`
 * rend le rejeu d'un lot idempotent (`ON CONFLICT DO NOTHING`).
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('boat_ais_sightings', (table) => {
      table.bigIncrements('id')
      table.integer('boat_id').unsigned().notNullable()
      table.foreign('boat_id').references('boats.id').onDelete('CASCADE')
      table.integer('source_id').unsigned().notNullable()
      table.foreign('source_id').references('boat_instrument_sources.id').onDelete('CASCADE')
      table.string('mmsi', 9).notNullable()
      table.timestamp('recorded_at', { useTz: true }).notNullable()
      table.string('name', 120).nullable()
      table.decimal('latitude', 9, 6).notNullable()
      table.decimal('longitude', 9, 6).notNullable()
      table.decimal('sog_ms', 8, 3).nullable()
      table.decimal('cog_rad', 7, 4).nullable()
      table.smallint('ship_type').nullable()
      table.string('ship_type_name', 60).nullable()
      table.decimal('cpa_m', 12, 1).nullable()
      table.decimal('tcpa_s', 12, 1).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.unique(['source_id', 'mmsi', 'recorded_at'])
      table.index(['boat_id', 'recorded_at'])
    })
  }

  async down() {
    this.schema.dropTable('boat_ais_sightings')
  }
}
