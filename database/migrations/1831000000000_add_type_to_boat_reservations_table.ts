import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Type de prestation d'une réservation (#585) : coque nue, avec skipper,
 * journée, cabine. Nullable — les réservations déjà enregistrées restent
 * sans type et s'affichent comme avant.
 */
export default class extends BaseSchema {
  protected tableName = 'boat_reservations'
  protected constraintName = 'boat_reservations_type_check'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('type', 20).nullable()
    })

    this.schema.raw(
      `ALTER TABLE "${this.tableName}" ADD CONSTRAINT "${this.constraintName}" CHECK (type IS NULL OR type IN ('bareboat', 'skippered', 'day_charter', 'cabin', 'other'))`
    )
  }

  async down() {
    this.schema.raw(
      `ALTER TABLE "${this.tableName}" DROP CONSTRAINT IF EXISTS "${this.constraintName}"`
    )
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('type')
    })
  }
}
