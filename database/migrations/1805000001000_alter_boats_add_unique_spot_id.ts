import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    await this.db.rawQuery('ALTER TABLE boats ADD CONSTRAINT uq_boats_spot_id UNIQUE (spot_id)')
  }

  async down() {
    await this.db.rawQuery('ALTER TABLE boats DROP CONSTRAINT uq_boats_spot_id')
  }
}
