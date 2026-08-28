import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ai_analyses'
  protected constraintName = 'ai_analyses_kind_check'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('boat_engine_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('boat_engines')
        .onDelete('CASCADE')
      table.index(['boat_engine_id', 'kind', 'locale'])
    })

    this.schema.raw(
      `ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS ${this.constraintName}`
    )
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT ${this.constraintName} CHECK (kind IN ('fleet_analysis', 'boat_suggestions', 'engine_diagnosis'))`
    )
  }

  async down() {
    // Échoue si des lignes 'engine_diagnosis' existent déjà — rollback
    // volontairement non permissif plutôt que de supprimer des données.
    this.schema.raw(
      `ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS ${this.constraintName}`
    )
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT ${this.constraintName} CHECK (kind IN ('fleet_analysis', 'boat_suggestions'))`
    )

    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['boat_engine_id', 'kind', 'locale'])
      table.dropColumn('boat_engine_id')
    })
  }
}
