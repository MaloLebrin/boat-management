import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Relances automatiques des factures en retard (#878).
 *
 * - `organizations.invoice_reminders_*` : relances activées (désactivées par
 *   défaut : aucun client ne reçoit de courrier sans que l'organisation l'ait
 *   décidé), message libre ajouté à chaque relance, mention des pénalités de
 *   retard ajoutée à la dernière ;
 * - `invoices.reminder_count` : relances réellement envoyées (badge « relancée
 *   ×2 ») ; `last_reminder_tier` : dernier palier traité, envoyé ou non (un
 *   palier ne se rejoue pas) ; `reminders_disabled` : « ne plus relancer »
 *   (client en litige) ;
 * - `invoice_reminders` : l'historique affiché sur la fiche facture.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('organizations', (table) => {
      table.boolean('invoice_reminders_enabled').notNullable().defaultTo(false)
      table.text('invoice_reminder_message').nullable()
      table.text('invoice_late_penalty_note').nullable()
    })

    this.schema.alterTable('invoices', (table) => {
      table.smallint('reminder_count').notNullable().defaultTo(0)
      table.smallint('last_reminder_tier').notNullable().defaultTo(0)
      table.timestamp('last_reminder_at', { useTz: true }).nullable()
      table.boolean('reminders_disabled').notNullable().defaultTo(false)
    })

    this.schema.createTable('invoice_reminders', (table) => {
      table.increments('id')
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
      table
        .integer('invoice_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('invoices')
        .onDelete('CASCADE')
      table.smallint('tier').notNullable()
      table.enu('trigger', ['automatic', 'manual']).notNullable()
      // `sent` : e-mail parti au client ; `skipped` : palier atteint mais
      // aucun envoi possible (client sans e-mail, anonymisé, blacklisté).
      table.enu('outcome', ['sent', 'skipped']).notNullable()
      table.string('skip_reason', 32).nullable()
      table
        .integer('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.index(['invoice_id'])
    })
  }

  async down() {
    this.schema.dropTable('invoice_reminders')

    this.schema.alterTable('invoices', (table) => {
      table.dropColumn('reminders_disabled')
      table.dropColumn('last_reminder_at')
      table.dropColumn('last_reminder_tier')
      table.dropColumn('reminder_count')
    })

    this.schema.alterTable('organizations', (table) => {
      table.dropColumn('invoice_late_penalty_note')
      table.dropColumn('invoice_reminder_message')
      table.dropColumn('invoice_reminders_enabled')
    })
  }
}
