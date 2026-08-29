import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Carburant avitaillé (#585). Jusqu'ici le carburant n'existait que sur le
 * moteur : un bateau bi-motorisation (in-bord diesel + hors-bord essence) ne
 * pouvait pas dire ce qu'il avait mis dans le réservoir. Même vocabulaire que
 * `boat_engines.fuel`, nullable — les pleins déjà saisis restent tels quels.
 */
export default class extends BaseSchema {
  protected tableName = 'boat_fuel_logs'
  protected constraintName = 'boat_fuel_logs_fuel_type_check'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('fuel_type', 20).nullable()
    })

    this.schema.raw(
      `ALTER TABLE "${this.tableName}" ADD CONSTRAINT "${this.constraintName}" CHECK (fuel_type IS NULL OR fuel_type IN ('diesel', 'essence', 'electric', 'other'))`
    )
  }

  async down() {
    this.schema.raw(
      `ALTER TABLE "${this.tableName}" DROP CONSTRAINT IF EXISTS "${this.constraintName}"`
    )
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('fuel_type')
    })
  }
}
