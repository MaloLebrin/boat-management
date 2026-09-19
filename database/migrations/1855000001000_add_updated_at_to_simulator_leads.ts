import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * `updated_at` sur les leads du simulateur (#775).
 *
 * `SimulatorLeadService.create()` fait un `updateOrCreate` clé sur l'e-mail :
 * un visiteur qui refait une simulation réécrit sa ligne. Sans `updated_at`,
 * la rétention aurait compté depuis la **toute première** visite et supprimé
 * un prospect encore actif. Les lignes existantes partent de leur
 * `created_at` : c'est la seule date d'activité qu'on ait à leur sujet.
 */
export default class extends BaseSchema {
  protected tableName = 'simulator_leads'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('updated_at').nullable()
    })

    this.defer(async (db) => {
      await db
        .from(this.tableName)
        .whereNull('updated_at')
        .update({ updated_at: db.raw('created_at') })
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('updated_at').notNullable().alter()
      table.index(['updated_at'], 'simulator_leads_updated_at_index')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['updated_at'], 'simulator_leads_updated_at_index')
      table.dropColumn('updated_at')
    })
  }
}
