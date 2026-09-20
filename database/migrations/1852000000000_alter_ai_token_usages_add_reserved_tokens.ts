import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Réservations de tokens IA en vol (#776).
 *
 * Le plafond mensuel était vérifié par un *read-modify-write* protégé par un
 * mutex en mémoire, donc mono-processus. Or le repo lance déjà trois processus
 * (serveur web, `queue:work`, `queue:work:ai`) et les appels au quota partent
 * des deux côtés : chacun avait sa `Map` de verrous, et le plafond se
 * contournait par course.
 *
 * Cette colonne porte les tokens **réservés mais pas encore consommés**, le
 * temps d'un appel Mistral. La vérification devient une seule opération
 * atomique côté base — un `INSERT … ON CONFLICT DO UPDATE … WHERE` dont le
 * zéro-ligne-retournée signifie « quota dépassé » — et le nombre de processus
 * n'a plus d'influence.
 *
 * Colonne distincte de `tokens_used` à dessein : les seuils de notification
 * (80 %, 100 %) et les statistiques continuent de ne lire que la consommation
 * réelle, donc une réservation en vol ne déclenche pas d'alerte prématurée.
 */
export default class extends BaseSchema {
  protected tableName = 'ai_token_usages'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.bigInteger('reserved_tokens').unsigned().notNullable().defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('reserved_tokens')
    })
  }
}
