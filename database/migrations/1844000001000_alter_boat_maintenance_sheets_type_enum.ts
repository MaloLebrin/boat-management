import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Étend l'enum `type` des fiches de maintenance aux quatre nouveaux gabarits
 * de #583 (`moteur_saison`, `carenage`, `catamaran`, `semi_rigide`) — même
 * mécanique que `1820..._alter_organization_memberships_role_enum.ts` : le
 * `table.enum()` de la migration d'origine est une contrainte CHECK côté
 * PostgreSQL, on la remplace.
 */
export default class extends BaseSchema {
  protected tableName = 'boat_maintenance_sheets'
  protected constraintName = 'boat_maintenance_sheets_type_check'

  async up() {
    this.schema.raw(
      `ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS ${this.constraintName}`
    )
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT ${this.constraintName} CHECK (type IN ('entretien', 'montage', 'hivernage', 'dehivernage', 'atelier', 'moteur_saison', 'carenage', 'catamaran', 'semi_rigide'))`
    )
  }

  async down() {
    // Échoue si des fiches utilisent déjà un nouveau type — rollback
    // volontairement non permissif plutôt que de supprimer des données.
    this.schema.raw(
      `ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS ${this.constraintName}`
    )
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT ${this.constraintName} CHECK (type IN ('entretien', 'montage', 'hivernage', 'dehivernage', 'atelier'))`
    )
  }
}
