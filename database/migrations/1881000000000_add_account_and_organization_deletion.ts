import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Suppression en libre-service du compte et de l'organisation (#886).
 *
 * - `users.deletion_requested_at` : demande de suppression du compte. La purge
 *   (anonymisation) a lieu `ACCOUNT_DELETION_GRACE_DAYS` jours plus tard ; une
 *   reconnexion entre-temps annule la demande.
 * - `users.anonymized_at` : compte purgé. La ligne survit, vidée de toute
 *   donnée personnelle : les saisies de l'utilisateur appartiennent à
 *   l'organisation et plusieurs clés `created_by` sont en `CASCADE`.
 * - `organizations.deletion_requested_at` : suppression demandée par un
 *   admin, récupérable pendant `ORGANIZATION_DELETION_GRACE_DAYS` jours,
 *   puis purge physique (Cloudinary compris).
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.timestamp('deletion_requested_at', { useTz: true }).nullable()
      table.timestamp('anonymized_at', { useTz: true }).nullable()
    })
    this.schema.alterTable('organizations', (table) => {
      table.timestamp('deletion_requested_at', { useTz: true }).nullable()
    })

    // Les jobs de purge ne lisent que les lignes en attente.
    this.schema.raw(
      'CREATE INDEX users_deletion_requested_at_index ON users (deletion_requested_at) WHERE deletion_requested_at IS NOT NULL AND anonymized_at IS NULL'
    )
    this.schema.raw(
      'CREATE INDEX organizations_deletion_requested_at_index ON organizations (deletion_requested_at) WHERE deletion_requested_at IS NOT NULL'
    )
  }

  async down() {
    this.schema.raw('DROP INDEX IF EXISTS organizations_deletion_requested_at_index')
    this.schema.raw('DROP INDEX IF EXISTS users_deletion_requested_at_index')
    this.schema.alterTable('organizations', (table) => {
      table.dropColumn('deletion_requested_at')
    })
    this.schema.alterTable('users', (table) => {
      table.dropColumn('deletion_requested_at')
      table.dropColumn('anonymized_at')
    })
  }
}
