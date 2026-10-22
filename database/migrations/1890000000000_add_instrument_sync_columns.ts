import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Synchronisation métier des instruments Signal K (#991, épopée #986).
 *
 * - `boat_engines.instrument_key` : l'`<id>` Signal K du moteur
 *   (`propulsion.<id>.runTime`), unique par bateau. `instrument_run_time_s` est
 *   la **base** du dernier `runTime` synchronisé, en secondes : seul l'écart à
 *   cette base alimente `hours` (D6), jamais le compteur absolu du calculateur.
 * - `navigation_log_entries.source` : `manual` (saisie ou rafale GPS) ou
 *   `instruments` (point posé par la synchronisation), pour le badge du journal.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('boat_engines', (table) => {
      table.string('instrument_key', 40).nullable()
      table.integer('instrument_run_time_s').nullable()
      table.unique(['boat_id', 'instrument_key'])
    })

    this.schema.alterTable('navigation_log_entries', (table) => {
      table.string('source', 20).notNullable().defaultTo('manual')
    })
  }

  async down() {
    this.schema.alterTable('navigation_log_entries', (table) => {
      table.dropColumn('source')
    })

    this.schema.alterTable('boat_engines', (table) => {
      table.dropUnique(['boat_id', 'instrument_key'])
      table.dropColumn('instrument_run_time_s')
      table.dropColumn('instrument_key')
    })
  }
}
