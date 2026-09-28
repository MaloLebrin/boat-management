import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Statut de disponibilité d'un bateau (#870) : `available` (défaut),
 * `in_maintenance`, `out_of_service` ou `sold`. `status_reason` porte le motif
 * saisi au changement, `status_changed_at` sa date — le bandeau de la fiche et
 * le contexte de l'assistant en ont besoin sans relire l'historique.
 *
 * L'historique complet vit dans `boat_status_changes` (de → vers, motif,
 * auteur, date) : c'est ce que le carnet transmissible attend. Il disparaît
 * avec le bateau (`CASCADE`), l'auteur passe à `NULL` si son compte est
 * supprimé.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('boats', (table) => {
      table.string('status', 20).notNullable().defaultTo('available').index()
      table.text('status_reason').nullable()
      table.timestamp('status_changed_at', { useTz: true }).nullable()
    })

    this.schema.raw(`
      ALTER TABLE "boats"
      ADD CONSTRAINT "boats_status_check"
      CHECK (status IN ('available','in_maintenance','out_of_service','sold'))
    `)

    this.schema.createTable('boat_status_changes', (table) => {
      table.increments('id')
      table
        .integer('boat_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('boats')
        .onDelete('CASCADE')
        .index()
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
        .index()
      table.string('from_status', 20).notNullable()
      table.string('to_status', 20).notNullable()
      table.text('reason').nullable()
      table
        .integer('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .index()
      table.timestamp('created_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable('boat_status_changes')
    this.schema.raw(`ALTER TABLE "boats" DROP CONSTRAINT IF EXISTS "boats_status_check"`)
    this.schema.alterTable('boats', (table) => {
      table.dropColumn('status')
      table.dropColumn('status_reason')
      table.dropColumn('status_changed_at')
    })
  }
}
