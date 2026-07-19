import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'organization_memberships'
  protected constraintName = 'organization_memberships_role_check'

  async up() {
    this.schema.raw(
      `ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS ${this.constraintName}`
    )
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT ${this.constraintName} CHECK (role IN ('admin', 'member', 'mechanic', 'boat_owner'))`
    )
  }

  async down() {
    // Échoue si des lignes utilisent déjà 'mechanic'/'boat_owner' — rollback
    // volontairement non permissif plutôt que de supprimer silencieusement des données.
    this.schema.raw(
      `ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS ${this.constraintName}`
    )
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT ${this.constraintName} CHECK (role IN ('admin', 'member'))`
    )
  }
}
