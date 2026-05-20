import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('spots', (table) => {
      table.check(
        '(pontoon_id IS NOT NULL AND mouillage_id IS NULL) OR (pontoon_id IS NULL AND mouillage_id IS NOT NULL)',
        [],
        'chk_spots_single_owner'
      )
    })
  }

  async down() {
    this.schema.alterTable('spots', (table) => {
      table.dropChecks('chk_spots_single_owner')
    })
  }
}
