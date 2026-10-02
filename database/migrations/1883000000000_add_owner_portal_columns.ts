import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Portail propriétaire interactif (#890).
 *
 * - `boat_budget_entries.visible_to_owner` : une dépense n'est montrée au
 *   propriétaire que si le gestionnaire l'a explicitement partagée — ses marges
 *   internes restent invisibles par défaut.
 * - `boat_maintenance_tasks.requested_by_owner_id` : la tâche est née d'une
 *   demande du propriétaire depuis son portail.
 * - `boat_maintenance_tasks.owner_approval_*` : un devis (coût prévu) au-dessus
 *   du seuil attend l'accord du propriétaire (`pending` → `approved` / `rejected`).
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('boat_budget_entries', (table) => {
      table.boolean('visible_to_owner').notNullable().defaultTo(false)
    })

    this.schema.alterTable('boat_maintenance_tasks', (table) => {
      table.integer('requested_by_owner_id').unsigned().nullable()
      table.foreign('requested_by_owner_id').references('users.id').onDelete('SET NULL')
      table.string('owner_approval_status', 20).nullable()
      table.timestamp('owner_approval_decided_at', { useTz: true }).nullable()
      table.integer('owner_approval_decided_by').unsigned().nullable()
      table.foreign('owner_approval_decided_by').references('users.id').onDelete('SET NULL')
      table.index(['boat_id', 'requested_by_owner_id'])
    })
  }

  async down() {
    this.schema.alterTable('boat_maintenance_tasks', (table) => {
      table.dropIndex(['boat_id', 'requested_by_owner_id'])
      table.dropForeign(['owner_approval_decided_by'])
      table.dropForeign(['requested_by_owner_id'])
      table.dropColumn('owner_approval_decided_by')
      table.dropColumn('owner_approval_decided_at')
      table.dropColumn('owner_approval_status')
      table.dropColumn('requested_by_owner_id')
    })

    this.schema.alterTable('boat_budget_entries', (table) => {
      table.dropColumn('visible_to_owner')
    })
  }
}
