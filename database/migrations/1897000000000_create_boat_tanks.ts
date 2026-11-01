import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Réservoirs d'un bateau (#1037). `type` ∈ types du catalogue `tanks.<type>`
 * (`shared/constants/tanks.ts`), `instrument_key` = `<type>.<id>`, unique par
 * bateau. `low_level_pct` est le seuil d'alerte propre à la cuve.
 */
export default class extends BaseSchema {
  protected tableName = 'boat_tanks'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('boat_id').unsigned().notNullable()
      table.foreign('boat_id').references('boats.id').onDelete('CASCADE')
      table.string('name', 120).notNullable()
      table.string('type', 24).notNullable()
      table.string('instrument_key', 40).nullable()
      table.integer('capacity_l').nullable()
      table.integer('low_level_pct').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['boat_id', 'instrument_key'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
