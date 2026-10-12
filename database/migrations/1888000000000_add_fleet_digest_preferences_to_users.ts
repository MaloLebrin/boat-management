import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Rapports de flotte par e-mail (#871) : synthèse hebdomadaire et rapport
 * mensuel. Deux préférences par utilisateur, `null` tant qu'il n'a rien
 * choisi — c'est alors le défaut de son rôle qui s'applique (les admins les
 * reçoivent, les autres membres les demandent).
 */
export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('weekly_digest_email').nullable()
      table.boolean('monthly_report_email').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('weekly_digest_email')
      table.dropColumn('monthly_report_email')
    })
  }
}
