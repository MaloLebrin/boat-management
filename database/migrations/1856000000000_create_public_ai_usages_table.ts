import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Compteurs journaliers de la surface IA publique (#762).
 *
 * Le plafond par visiteur des deux chats publics vivait dans la **session** :
 * vider ses cookies le remettait à zéro, et rien ne bornait le cumul. Cette
 * table le remplace par un compteur persistant, et porte en plus le budget de
 * tokens global — le seul garde-fou qui résiste à un pool d'IP.
 *
 * Trois colonnes de clé :
 *
 * - `day` — le compteur est journalier, pas cumulatif ;
 * - `surface` — `diagnosis` ou `part_search` pour une ligne par IP, `all`
 *   pour la ligne agrégée : les deux chats ne se volent pas leur budget de
 *   conversations, mais partagent le budget de tokens ;
 * - `client_key` — HMAC de l'IP salé par le jour, ou `global` pour la ligne
 *   agrégée. **Jamais l'IP en clair** : ce serait un journal d'adresses de
 *   visiteurs, et le sel journalier empêche de recouper deux jours.
 *
 * L'unicité du triplet est ce qui rend la réservation atomique : le `INSERT …
 * ON CONFLICT … WHERE` du service compte sur elle pour refuser une deuxième
 * conversation simultanée au-delà du plafond.
 */
export default class extends BaseSchema {
  protected tableName = 'public_ai_usages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.date('day').notNullable()
      table.string('surface', 32).notNullable()
      table.string('client_key', 64).notNullable()
      table.integer('conversations').notNullable().defaultTo(0)
      table.bigInteger('tokens_used').notNullable().defaultTo(0)
      table.timestamps(true, true)

      table.unique(['day', 'surface', 'client_key'], {
        indexName: 'public_ai_usages_day_surface_client_unique',
      })
      // Balayé par la purge des lignes périmées.
      table.index(['day'], 'public_ai_usages_day_index')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
