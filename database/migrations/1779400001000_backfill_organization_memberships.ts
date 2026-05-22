import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    await this.db.rawQuery(`
      INSERT INTO organization_memberships (user_id, organization_id, role, created_at, updated_at)
      SELECT id, organization_id, 'admin', NOW(), NOW()
      FROM users
      WHERE organization_id IS NOT NULL
      ON CONFLICT (user_id, organization_id) DO NOTHING
    `)
  }

  async down() {
    // Intentionally empty — backfill is non-reversible without data loss risk
  }
}
