import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_maintenance_tasks'

  async up() {
    /**
     * Data migration: copy due_at from events → open tasks.
     * Idempotent: insert only when no identical task exists.
     *
     * We intentionally use SQL/knex here (not Lucid models) to avoid
     * connection pool issues and keep the migration deterministic.
     */
    await this.db.raw(`
      INSERT INTO boat_maintenance_tasks (
        boat_id,
        subject,
        boat_engine_id,
        boat_sail_id,
        boat_rig_id,
        title,
        notes,
        status,
        done_at,
        due_at,
        recurrence_interval_months,
        due_engine_hours,
        recurrence_interval_engine_hours,
        last_done_engine_hours,
        done_engine_hours,
        created_at,
        updated_at
      )
      SELECT
        e.boat_id,
        e.subject,
        e.boat_engine_id,
        e.boat_sail_id,
        e.boat_rig_id,
        e.title,
        e.notes,
        'open',
        NULL,
        e.due_at,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        CURRENT_TIMESTAMP,
        NULL
      FROM boat_maintenance_events e
      WHERE e.due_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM boat_maintenance_tasks t
          WHERE t.boat_id = e.boat_id
            AND t.subject = e.subject
            AND t.title = e.title
            AND t.due_at = e.due_at
        )
    `)
  }

  async down() {
    // No-op: we don't delete migrated tasks automatically
  }
}
