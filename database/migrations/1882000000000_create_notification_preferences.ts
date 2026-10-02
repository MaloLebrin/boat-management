import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Préférences de notifications par famille et par canal (#888).
 *
 * - `notification_preferences` : une ligne par (utilisateur, famille), posée
 *   au premier enregistrement de la matrice. Sans ligne, ce sont les défauts
 *   du rôle (`DEFAULT_NOTIFICATION_PREFERENCES`) qui s'appliquent.
 * - `users.notification_timezone` / `notification_quiet_hours` /
 *   `notification_email_digest` : heures calmes du push (22h-7h dans le
 *   fuseau de l'utilisateur) et regroupement des e-mails en un résumé de 8h.
 * - `notifications.in_app` : une notification coupée in-app reste écrite —
 *   c'est le journal qui sert l'anti-doublon des scans —, mais n'apparaît ni
 *   dans la cloche ni dans la page.
 * - `notifications.email_digest_pending` : notification en attente du
 *   prochain résumé quotidien.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('notification_preferences', (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().notNullable()
      table.foreign('user_id').references('users.id').onDelete('CASCADE')
      table.string('family', 30).notNullable()
      table.boolean('in_app').notNullable().defaultTo(true)
      table.boolean('push').notNullable().defaultTo(true)
      table.boolean('email').notNullable().defaultTo(false)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.unique(['user_id', 'family'])
    })

    this.schema.alterTable('users', (table) => {
      table.string('notification_timezone', 64).notNullable().defaultTo('Europe/Paris')
      table.boolean('notification_quiet_hours').notNullable().defaultTo(false)
      table.boolean('notification_email_digest').notNullable().defaultTo(false)
    })

    this.schema.alterTable('notifications', (table) => {
      table.boolean('in_app').notNullable().defaultTo(true)
      table.boolean('email_digest_pending').notNullable().defaultTo(false)
    })

    // Le job du résumé ne lit que les notifications en attente.
    this.schema.raw(
      'CREATE INDEX notifications_email_digest_pending_index ON notifications (user_id) WHERE email_digest_pending = true'
    )
  }

  async down() {
    this.schema.raw('DROP INDEX IF EXISTS notifications_email_digest_pending_index')
    this.schema.alterTable('notifications', (table) => {
      table.dropColumn('in_app')
      table.dropColumn('email_digest_pending')
    })
    this.schema.alterTable('users', (table) => {
      table.dropColumn('notification_timezone')
      table.dropColumn('notification_quiet_hours')
      table.dropColumn('notification_email_digest')
    })
    this.schema.dropTable('notification_preferences')
  }
}
