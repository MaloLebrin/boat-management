import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Index composites pour les requêtes du tableau de bord (#832) : sorties en
 * cours, incidents ouverts, documents à échéance et tâches urgentes sont
 * désormais agrégés par organisation à chaque affichage. PostgreSQL n'indexe
 * pas les clés étrangères : `organization_id` et `boat_id` seuls forçaient un
 * parcours séquentiel.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('navigation_logs', (table) => {
      table.index(['organization_id', 'status'], 'navigation_logs_org_status_idx')
    })
    this.schema.alterTable('boat_incidents', (table) => {
      table.index(['organization_id', 'status'], 'boat_incidents_org_status_idx')
    })
    this.schema.alterTable('boat_documents', (table) => {
      table.index(['organization_id', 'expires_at'], 'boat_documents_org_expires_idx')
    })
    this.schema.alterTable('boat_maintenance_tasks', (table) => {
      table.index(['boat_id', 'status'], 'boat_maintenance_tasks_boat_status_idx')
    })
  }

  async down() {
    this.schema.alterTable('navigation_logs', (table) => {
      table.dropIndex(['organization_id', 'status'], 'navigation_logs_org_status_idx')
    })
    this.schema.alterTable('boat_incidents', (table) => {
      table.dropIndex(['organization_id', 'status'], 'boat_incidents_org_status_idx')
    })
    this.schema.alterTable('boat_documents', (table) => {
      table.dropIndex(['organization_id', 'expires_at'], 'boat_documents_org_expires_idx')
    })
    this.schema.alterTable('boat_maintenance_tasks', (table) => {
      table.dropIndex(['boat_id', 'status'], 'boat_maintenance_tasks_boat_status_idx')
    })
  }
}
