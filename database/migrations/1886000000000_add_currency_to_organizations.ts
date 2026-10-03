import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Devise de travail de l'organisation (#627).
 *
 * Code ISO 4217 (`EUR`, `USD`, `AUD`…) : défaut de tout montant sans devise
 * propre (budget, carburant, statistiques) et devise proposée à la création
 * d'une facture ou d'un tarif. Les organisations existantes restent en euros.
 */
export default class extends BaseSchema {
  protected tableName = 'organizations'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('currency', 3).notNullable().defaultTo('EUR')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('currency')
    })
  }
}
