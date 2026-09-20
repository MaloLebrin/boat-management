import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Vérification de l'adresse e-mail (#768).
 *
 * L'inscription créait directement un utilisateur, une organisation et une
 * session : rien ne prouvait que l'adresse saisie appartenait à la personne
 * qui s'inscrivait. Or l'e-mail est le pivot de l'app — clé de connexion,
 * canal de réinitialisation, cible des invitations, destinataire des factures
 * et des relances.
 *
 * **Les comptes existants sont marqués vérifiés**, plutôt que de déconnecter
 * tout le monde du jour au lendemain derrière une garde qu'ils n'ont jamais
 * eu l'occasion de franchir. Ce n'est pas une preuve rétroactive : c'est le
 * seul choix qui ne casse pas des comptes en service, et la garde ne
 * s'applique qu'aux inscriptions postérieures.
 */
export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('email_verified_at').nullable()
    })

    this.defer(async (db) => {
      await db
        .from(this.tableName)
        .whereNull('email_verified_at')
        .update({
          email_verified_at: db.raw('NOW()'),
        })
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('email_verified_at')
    })
  }
}
