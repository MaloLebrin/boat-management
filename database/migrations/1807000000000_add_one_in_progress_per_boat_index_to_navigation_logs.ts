import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Guard against duplicate in-progress trips per boat. Before creating the
    // partial unique index, close any pre-existing duplicates (keep the most
    // recent in-progress trip per boat, mark the older ones as completed) so the
    // index can be created on existing data.
    await this.db.rawQuery(`
      UPDATE navigation_logs nl
      SET status = 'completed'
      WHERE status = 'in_progress'
        AND id <> (
          SELECT MAX(dup.id)
          FROM navigation_logs dup
          WHERE dup.boat_id = nl.boat_id AND dup.status = 'in_progress'
        )
    `)

    await this.db.rawQuery(`
      CREATE UNIQUE INDEX one_in_progress_per_boat
      ON navigation_logs (boat_id)
      WHERE status = 'in_progress'
    `)
  }

  async down() {
    await this.db.rawQuery('DROP INDEX IF EXISTS one_in_progress_per_boat')
  }
}
