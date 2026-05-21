import { BaseSchema } from '@adonisjs/lucid/schema'

// Tokens previously stored as plain text are now stored as SHA-256 hashes.
// Existing tokens are invalidated to prevent plain-text lookup bypass.
export default class extends BaseSchema {
  protected tableName = 'password_reset_tokens'

  async up() {
    await this.db.rawQuery('TRUNCATE TABLE ??', [this.tableName])
  }

  async down() {
    // No rollback: tokens are short-lived (1 h) and cannot be reversed.
  }
}
