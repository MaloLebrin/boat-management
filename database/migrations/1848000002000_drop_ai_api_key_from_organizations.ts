import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Supprime l'ancienne colonne BYOK mono-fournisseur : les clés vivent
 * désormais dans `organization_ai_keys` (une par fournisseur). Migration
 * séparée de la copie (#1848000001000) pour que le drop s'exécute
 * prouvablement après elle.
 *
 * `down()` restaure la colonne et y recopie la clé Mistral de chaque
 * organisation depuis `organization_ai_keys`.
 */
export default class extends BaseSchema {
  protected tableName = 'organizations'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('ai_api_key_encrypted')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('ai_api_key_encrypted').nullable()
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        update organizations set ai_api_key_encrypted = (
          select k.api_key_encrypted
          from organization_ai_keys k
          where k.organization_id = organizations.id and k.provider = 'mistral'
        )
      `)
    })
  }
}
