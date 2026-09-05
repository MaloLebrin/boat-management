import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Clé API Mistral propre à l'organisation (BYOK) : quand elle est renseignée,
 * les appels IA du copilote consomment sur le compte Mistral de l'org et le
 * quota de tokens mensuel de l'app ne s'applique plus (l'usage reste
 * enregistré pour les statistiques).
 *
 * Stockée chiffrée via `@adonisjs/core/encryption` (APP_KEY) — jamais en
 * clair, jamais renvoyée au frontend.
 */
export default class extends BaseSchema {
  protected tableName = 'organizations'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('ai_api_key_encrypted').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('ai_api_key_encrypted')
    })
  }
}
