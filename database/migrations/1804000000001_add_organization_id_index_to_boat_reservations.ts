import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_reservations'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.index(['organization_id', 'starts_at'], 'boat_reservations_org_starts_idx')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['organization_id', 'starts_at'], 'boat_reservations_org_starts_idx')
    })
  }
}
