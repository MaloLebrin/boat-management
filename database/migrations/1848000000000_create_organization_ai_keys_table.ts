import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Clés API IA par fournisseur (BYOK multi-fournisseurs) : une organisation
 * peut enregistrer une clé pour chacun des fournisseurs supportés (`mistral`,
 * `anthropic`, `openai`, `google` — cf. `AI_PROVIDERS` dans
 * `shared/types/ai.ts`), puis choisir le fournisseur actif via
 * `organizations.ai_provider`.
 *
 * `api_key_encrypted` est chiffrée via `@adonisjs/core/encryption` (APP_KEY) —
 * jamais en clair, jamais renvoyée au frontend (seuls des booléens sortent du
 * backend). Une ligne par couple org/fournisseur (contrainte unique) : un
 * nouvel enregistrement remplace la clé existante.
 */
export default class extends BaseSchema {
  protected tableName = 'organization_ai_keys'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
      table.string('provider', 20).notNullable()
      table.text('api_key_encrypted').notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['organization_id', 'provider'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
