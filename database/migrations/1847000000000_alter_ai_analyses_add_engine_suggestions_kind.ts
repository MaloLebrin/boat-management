import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ai_analyses'
  protected constraintName = 'ai_analyses_kind_check'

  async up() {
    this.schema.raw(
      `ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS ${this.constraintName}`
    )
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT ${this.constraintName} CHECK (kind IN ('fleet_analysis', 'boat_suggestions', 'engine_diagnosis', 'engine_suggestions'))`
    )
  }

  async down() {
    // Échoue si des lignes 'engine_suggestions' existent déjà — rollback
    // volontairement non permissif plutôt que de supprimer des données.
    this.schema.raw(
      `ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS ${this.constraintName}`
    )
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT ${this.constraintName} CHECK (kind IN ('fleet_analysis', 'boat_suggestions', 'engine_diagnosis'))`
    )
  }
}
