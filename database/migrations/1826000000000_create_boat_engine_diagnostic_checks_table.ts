import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boat_engine_diagnostic_checks'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('boat_engine_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('boat_engines')
        .onDelete('CASCADE')
      // Clé stable d'une étape de checklist (`<scope>.<slug>`), définie dans
      // shared/constants/diagnostic/diagnostic_content.ts. Présence de la
      // ligne = étape cochée.
      table.string('step_key', 64).notNullable()
      table.timestamp('created_at').notNullable()

      table.unique(['boat_engine_id', 'step_key'], { indexName: 'bedc_engine_step_unique' })
      table.index(['boat_engine_id'], 'bedc_engine_index')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
