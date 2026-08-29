import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Élargit `crew_certifications.type` au vocabulaire partagé des titres de
 * navigation (#585) : + `inland_permit`, `captain_200`, `crr`,
 * `medical_certificate`, `first_aid`. Les six valeurs déjà en base restent
 * acceptées, aucune ligne n'est invalidée.
 *
 * La colonne a été créée avec `table.enu()` : côté Postgres c'est une colonne
 * texte + une contrainte CHECK, qu'on remplace ici.
 */
export default class extends BaseSchema {
  protected tableName = 'crew_certifications'
  protected constraintName = 'crew_certifications_type_check'

  async up() {
    this.schema.raw(
      `ALTER TABLE "${this.tableName}" DROP CONSTRAINT IF EXISTS "${this.constraintName}"`
    )
    this.schema.raw(
      `ALTER TABLE "${this.tableName}" ADD CONSTRAINT "${this.constraintName}" CHECK (type IN ('coastal_permit', 'offshore_permit', 'inland_permit', 'captain_200', 'vhf', 'crr', 'stcw_basic', 'stcw_proficiency', 'medical_certificate', 'first_aid', 'other'))`
    )
  }

  async down() {
    // Échoue si des certifications utilisent déjà une des nouvelles valeurs —
    // rollback volontairement non permissif plutôt que de perdre des données
    // silencieusement.
    this.schema.raw(
      `ALTER TABLE "${this.tableName}" DROP CONSTRAINT IF EXISTS "${this.constraintName}"`
    )
    this.schema.raw(
      `ALTER TABLE "${this.tableName}" ADD CONSTRAINT "${this.constraintName}" CHECK (type IN ('coastal_permit', 'offshore_permit', 'vhf', 'stcw_basic', 'stcw_proficiency', 'other'))`
    )
  }
}
