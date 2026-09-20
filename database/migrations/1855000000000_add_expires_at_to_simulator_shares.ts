import { BaseSchema } from '@adonisjs/lucid/schema'
import { SIMULATOR_SHARE_LIFETIME_DAYS } from '#shared/constants/data_retention'

/**
 * Expiration et jeton élargi pour les partages du simulateur (#775).
 *
 * `simulator_shares` n'avait aucune colonne d'expiration : un lien émis une
 * fois restait valide pour toujours, et la table ne pouvait que croître. La
 * durée de vie est matérialisée ici plutôt que calculée à la lecture, pour
 * que la purge et la page de lecture s'accordent sans se répéter — et pour
 * qu'un partage émis avant un changement de politique garde l'échéance qu'on
 * lui avait promise.
 *
 * Les lignes existantes sont rattrapées sur leur propre `created_at` : un
 * partage vieux de plus de six mois devient donc expiré au déploiement. C'est
 * l'intention — il l'était déjà en fait, sans que rien ne le dise.
 *
 * Le jeton passe de 12 à 64 caractères : le service émet désormais
 * `randomBytes(16)` (32 hexa) au lieu de `randomBytes(6)` (12 hexa). Les
 * anciens jetons restent lisibles tels quels — la recherche est une égalité
 * de chaîne, elle ne dépend pas de la longueur — et disparaîtront d'eux-mêmes
 * avec la purge.
 */
export default class extends BaseSchema {
  protected tableName = 'simulator_shares'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('expires_at').nullable()
      table.string('token', 64).notNullable().alter()
    })

    this.defer(async (db) => {
      await db
        .from(this.tableName)
        .whereNull('expires_at')
        .update({
          expires_at: db.raw("created_at + interval '?? days'", [SIMULATOR_SHARE_LIFETIME_DAYS]),
        })
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('expires_at').notNullable().alter()
      table.index(['expires_at'], 'simulator_shares_expires_at_index')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['expires_at'], 'simulator_shares_expires_at_index')
      table.dropColumn('expires_at')
      table.string('token', 12).notNullable().alter()
    })
  }
}
