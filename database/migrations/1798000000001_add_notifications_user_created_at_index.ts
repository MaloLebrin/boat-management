import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.table('notifications', (table) => {
      table.index(['user_id', 'created_at'], 'notifications_user_id_created_at_idx')
    })
  }

  async down() {
    this.schema.table('notifications', (table) => {
      table.dropIndex(['user_id', 'created_at'], 'notifications_user_id_created_at_idx')
    })
  }
}
