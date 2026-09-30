import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Index btree sur les colonnes de clé étrangère qui n'en avaient pas (#857).
 *
 * PostgreSQL ne crée pas d'index sur la colonne référençante d'une FK : chaque
 * jointure / filtre, et chaque `ON DELETE CASCADE` / `SET NULL` déclenché sur
 * la table parente, faisait un scan séquentiel de la table enfant. Les tables
 * sont encore petites — index classiques dans la transaction, pas
 * `CREATE INDEX CONCURRENTLY`.
 *
 * Le test `tests/integration/db/fk_indexes.spec.ts` garantit qu'aucune FK
 * publique ne reste sans index.
 */
export default class extends BaseSchema {
  #indexes: Array<{ table: string; column: string; name: string }> = [
    {
      table: 'ai_diagnosis_conversations',
      column: 'user_id',
      name: 'ai_diagnosis_conversations_user_id_idx',
    },
    {
      table: 'ai_part_search_conversations',
      column: 'identified_engine_model_id',
      name: 'ai_part_search_conversations_identified_engine_model_id_idx',
    },
    {
      table: 'ai_part_search_conversations',
      column: 'user_id',
      name: 'ai_part_search_conversations_user_id_idx',
    },
    { table: 'audit_logs', column: 'user_id', name: 'audit_logs_user_id_idx' },
    {
      table: 'boat_budget_entries',
      column: 'boat_id',
      name: 'boat_budget_entries_boat_id_idx',
    },
    { table: 'boat_documents', column: 'boat_id', name: 'boat_documents_boat_id_idx' },
    { table: 'boat_documents', column: 'media_id', name: 'boat_documents_media_id_idx' },
    {
      table: 'boat_engine_parts',
      column: 'boat_engine_id',
      name: 'boat_engine_parts_boat_engine_id_idx',
    },
    {
      table: 'boat_equipment_actions',
      column: 'created_by',
      name: 'boat_equipment_actions_created_by_idx',
    },
    {
      table: 'boat_equipment_actions',
      column: 'inspection_id',
      name: 'boat_equipment_actions_inspection_id_idx',
    },
    {
      table: 'boat_equipment_actions',
      column: 'organization_id',
      name: 'boat_equipment_actions_organization_id_idx',
    },
    {
      table: 'boat_fuel_logs',
      column: 'boat_engine_id',
      name: 'boat_fuel_logs_boat_engine_id_idx',
    },
    { table: 'boat_fuel_logs', column: 'boat_id', name: 'boat_fuel_logs_boat_id_idx' },
    {
      table: 'boat_fuel_logs',
      column: 'organization_id',
      name: 'boat_fuel_logs_organization_id_idx',
    },
    {
      table: 'boat_generic_equipment',
      column: 'boat_id',
      name: 'boat_generic_equipment_boat_id_idx',
    },
    { table: 'boat_incidents', column: 'boat_id', name: 'boat_incidents_boat_id_idx' },
    {
      table: 'boat_inspections',
      column: 'organization_id',
      name: 'boat_inspections_organization_id_idx',
    },
    {
      table: 'boat_maintenance_events',
      column: 'boat_engine_id',
      name: 'boat_maintenance_events_boat_engine_id_idx',
    },
    {
      table: 'boat_maintenance_events',
      column: 'boat_id',
      name: 'boat_maintenance_events_boat_id_idx',
    },
    {
      table: 'boat_maintenance_events',
      column: 'boat_rig_id',
      name: 'boat_maintenance_events_boat_rig_id_idx',
    },
    {
      table: 'boat_maintenance_events',
      column: 'boat_sail_id',
      name: 'boat_maintenance_events_boat_sail_id_idx',
    },
    {
      table: 'boat_maintenance_parts',
      column: 'maintenance_event_id',
      name: 'boat_maintenance_parts_maintenance_event_id_idx',
    },
    {
      table: 'boat_maintenance_sheet_items',
      column: 'boat_maintenance_sheet_id',
      name: 'boat_maintenance_sheet_items_boat_maintenance_sheet_id_idx',
    },
    {
      table: 'boat_maintenance_sheets',
      column: 'boat_id',
      name: 'boat_maintenance_sheets_boat_id_idx',
    },
    {
      table: 'boat_maintenance_tasks',
      column: 'boat_engine_id',
      name: 'boat_maintenance_tasks_boat_engine_id_idx',
    },
    {
      table: 'boat_maintenance_tasks',
      column: 'boat_rig_id',
      name: 'boat_maintenance_tasks_boat_rig_id_idx',
    },
    {
      table: 'boat_maintenance_tasks',
      column: 'boat_sail_id',
      name: 'boat_maintenance_tasks_boat_sail_id_idx',
    },
    { table: 'boat_port_stays', column: 'boat_id', name: 'boat_port_stays_boat_id_idx' },
    {
      table: 'boat_safety_equipment',
      column: 'boat_id',
      name: 'boat_safety_equipment_boat_id_idx',
    },
    {
      table: 'calendar_feeds',
      column: 'created_by_user_id',
      name: 'calendar_feeds_created_by_user_id_idx',
    },
    {
      table: 'crew_certifications',
      column: 'crew_member_id',
      name: 'crew_certifications_crew_member_id_idx',
    },
    {
      table: 'crew_members',
      column: 'organization_id',
      name: 'crew_members_organization_id_idx',
    },
    {
      table: 'external_calendars',
      column: 'created_by_user_id',
      name: 'external_calendars_created_by_user_id_idx',
    },
    {
      table: 'invoice_reminders',
      column: 'organization_id',
      name: 'invoice_reminders_organization_id_idx',
    },
    {
      table: 'invoice_reminders',
      column: 'user_id',
      name: 'invoice_reminders_user_id_idx',
    },
    { table: 'invoices', column: 'client_id', name: 'invoices_client_id_idx' },
    { table: 'invoices', column: 'reservation_id', name: 'invoices_reservation_id_idx' },
    { table: 'media', column: 'uploaded_by_id', name: 'media_uploaded_by_id_idx' },
    {
      table: 'navigation_log_entries',
      column: 'organization_id',
      name: 'navigation_log_entries_organization_id_idx',
    },
    {
      table: 'navigation_logs',
      column: 'arrival_port_id',
      name: 'navigation_logs_arrival_port_id_idx',
    },
    {
      table: 'navigation_logs',
      column: 'departure_port_id',
      name: 'navigation_logs_departure_port_id_idx',
    },
    {
      table: 'organization_invitations',
      column: 'invited_by_id',
      name: 'organization_invitations_invited_by_id_idx',
    },
    { table: 'pending_imports', column: 'boat_id', name: 'pending_imports_boat_id_idx' },
    {
      table: 'push_subscriptions',
      column: 'organization_id',
      name: 'push_subscriptions_organization_id_idx',
    },
    {
      table: 'remember_me_tokens',
      column: 'tokenable_id',
      name: 'remember_me_tokens_tokenable_id_idx',
    },
    {
      table: 'rental_contracts',
      column: 'client_id',
      name: 'rental_contracts_client_id_idx',
    },
    {
      table: 'rental_contracts',
      column: 'media_id',
      name: 'rental_contracts_media_id_idx',
    },
    {
      table: 'rental_contracts',
      column: 'organization_id',
      name: 'rental_contracts_organization_id_idx',
    },
  ]

  async up() {
    for (const { table, column, name } of this.#indexes) {
      this.schema.alterTable(table, (t) => {
        t.index([column], name)
      })
    }
  }

  async down() {
    for (const { table, column, name } of [...this.#indexes].reverse()) {
      this.schema.alterTable(table, (t) => {
        t.dropIndex([column], name)
      })
    }
  }
}
