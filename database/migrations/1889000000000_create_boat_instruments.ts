import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Instruments de bord via Signal K — socle backend (#988, épopée #986).
 *
 * - `boat_instrument_sources` : une source par bateau et par `kind`
 *   (`signalk` seul pour l'instant). `base_url` est une **origine** validée
 *   (`https?://hôte[:port]`, sans chemin), `token_encrypted` le jeton Signal K
 *   chiffré au repos (`DataEncryptionService`), `vessel_context` le contexte
 *   Signal K lu (`vessels.self` par défaut). `last_seen_at` / `last_error`
 *   sont posés par l'ingestion. `organization_id` double celui du bateau pour
 *   `OrgScopedPolicy`.
 * - `boat_telemetry_samples` : append-only, un échantillon par chemin et par
 *   fenêtre d'agrégation du client. `value` porte les mesures numériques (SI,
 *   telles qu'émises par Signal K), `value_json` les valeurs structurées
 *   (position, alarmes `notifications.*`). L'unicité `(source_id, path,
 *   recorded_at)` rend le rejeu d'un lot idempotent (`ON CONFLICT DO NOTHING`).
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('boat_instrument_sources', (table) => {
      table.increments('id')
      table.integer('boat_id').unsigned().notNullable()
      table.foreign('boat_id').references('boats.id').onDelete('CASCADE')
      table.integer('organization_id').unsigned().notNullable()
      table.foreign('organization_id').references('organizations.id').onDelete('CASCADE')
      table.string('kind', 20).notNullable().defaultTo('signalk')
      table.string('base_url', 255).notNullable()
      table.text('token_encrypted').nullable()
      table.string('vessel_context', 120).notNullable().defaultTo('vessels.self')
      table.boolean('enabled').notNullable().defaultTo(true)
      table.timestamp('last_seen_at', { useTz: true }).nullable()
      table.string('last_error', 255).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['boat_id', 'kind'])
      table.index(['boat_id'])
      table.index(['organization_id'])
    })

    this.schema.createTable('boat_telemetry_samples', (table) => {
      table.bigIncrements('id')
      table.integer('boat_id').unsigned().notNullable()
      table.foreign('boat_id').references('boats.id').onDelete('CASCADE')
      table.integer('source_id').unsigned().notNullable()
      table.foreign('source_id').references('boat_instrument_sources.id').onDelete('CASCADE')
      table.string('path', 96).notNullable()
      table.timestamp('recorded_at', { useTz: true }).notNullable()
      table.decimal('value', 14, 4).nullable()
      table.jsonb('value_json').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.unique(['source_id', 'path', 'recorded_at'])
      // « Dernière valeur par chemin » et fenêtre récente d'un bateau.
      table.index(
        ['boat_id', 'path', 'recorded_at'],
        'boat_telemetry_samples_boat_path_recorded_idx'
      )
    })
    // L'index composite ci-dessus couvre `boat_id` ; `source_id` est en tête de
    // la contrainte unique. Knex ne sait pas poser `DESC` sur une colonne
    // d'index : on le fait en SQL pour que « dernier échantillon » lise le
    // début de l'index.
    this.schema.raw(
      'DROP INDEX IF EXISTS boat_telemetry_samples_boat_path_recorded_idx; ' +
        'CREATE INDEX boat_telemetry_samples_boat_path_recorded_idx ' +
        'ON boat_telemetry_samples (boat_id, path, recorded_at DESC)'
    )
  }

  async down() {
    this.schema.dropTable('boat_telemetry_samples')
    this.schema.dropTable('boat_instrument_sources')
  }
}
