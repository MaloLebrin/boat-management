import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Un incident peut viser un équipement précis du bateau — un moteur, une
 * voile, le gréement, un équipement de sécurité ou générique — ou une pièce
 * moteur (#813). Six FK nullables en `SET NULL`, au plus une posée à la fois
 * (règle tenue par `BoatIncidentService`), sur le modèle des tâches.
 */
export default class extends BaseSchema {
  protected tableName = 'boat_incidents'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('boat_engine_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('boat_engines')
        .onDelete('SET NULL')
        .index()
      table
        .integer('boat_sail_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('boat_sails')
        .onDelete('SET NULL')
        .index()
      table
        .integer('boat_rig_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('boat_rigs')
        .onDelete('SET NULL')
        .index()
      table
        .integer('boat_safety_equipment_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('boat_safety_equipment')
        .onDelete('SET NULL')
        .index()
      table
        .integer('boat_generic_equipment_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('boat_generic_equipment')
        .onDelete('SET NULL')
        .index()
      table
        .integer('boat_engine_part_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('boat_engine_parts')
        .onDelete('SET NULL')
        .index()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('boat_engine_id')
      table.dropColumn('boat_sail_id')
      table.dropColumn('boat_rig_id')
      table.dropColumn('boat_safety_equipment_id')
      table.dropColumn('boat_generic_equipment_id')
      table.dropColumn('boat_engine_part_id')
    })
  }
}
