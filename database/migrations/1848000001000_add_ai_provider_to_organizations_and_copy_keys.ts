import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Fournisseur IA actif de l'organisation (BYOK multi-fournisseurs).
 *
 * `ai_provider` nullable : `null` = clé Mistral de l'app (le quota de tokens
 * mensuel s'applique) ; sinon l'assistant consomme la clé
 * `organization_ai_keys` du fournisseur choisi (quota bypassé, usage émargé).
 *
 * Copie de données : les clés Mistral existantes (`ai_api_key_encrypted`,
 * BYOK mono-fournisseur de #1846000001000) deviennent des lignes
 * `provider='mistral'` et ces organisations gardent leur comportement en étant
 * basculées sur `ai_provider='mistral'`. La colonne d'origine est supprimée
 * par la migration suivante (fichier séparé pour garantir l'ordre
 * copie → drop).
 */
export default class extends BaseSchema {
  protected tableName = 'organizations'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('ai_provider', 20).nullable()
    })

    // `defer` : l'`alterTable` ci-dessus doit être exécuté avant les copies.
    this.defer(async (db) => {
      await db.rawQuery(`
        insert into organization_ai_keys (organization_id, provider, api_key_encrypted)
        select id, 'mistral', ai_api_key_encrypted
        from organizations
        where ai_api_key_encrypted is not null
      `)
      await db
        .from('organizations')
        .whereNotNull('ai_api_key_encrypted')
        .update({ ai_provider: 'mistral' })
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('ai_provider')
    })
  }
}
