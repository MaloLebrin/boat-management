import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Jeton d'ingestion du plugin Signal K (#994, épopée #986, D1).
 *
 * Le plugin qui tourne à bord pousse ses lots sur `POST /api/instruments/
 * ingest` avec `Authorization: Bearer <jeton>`. Le jeton n'est affiché qu'une
 * fois à sa génération : on ne garde que son **sha256** (`ingest_token_hash`,
 * 64 caractères hexadécimaux, unique — l'index sert la recherche par jeton).
 * `ingest_token_issued_at` dit à l'admin de quand date le jeton en cours.
 */
export default class extends BaseSchema {
  protected tableName = 'boat_instrument_sources'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('ingest_token_hash', 64).nullable().unique()
      table.timestamp('ingest_token_issued_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('ingest_token_issued_at')
      table.dropColumn('ingest_token_hash')
    })
  }
}
