import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Paiement en ligne des factures par le client final (#876).
 *
 * - `organizations.stripe_connect_*` : le compte Stripe **connecté** de
 *   l'organisation (Stripe Connect Standard). Les fonds vont directement sur
 *   ce compte, pas sur celui de FleetAi ; `charges_enabled` recopie l'état
 *   d'onboarding que Stripe pousse par `account.updated` ;
 * - `invoices.payment_token` : jeton opaque de la page publique `/pay/:token`
 *   (sans login), posé à l'envoi de la facture ;
 * - `invoices.stripe_checkout_session_id` / `stripe_payment_intent_id` : la
 *   dernière session Checkout ouverte et le paiement qui a réglé la facture.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('organizations', (table) => {
      table.string('stripe_connect_account_id', 255).nullable().unique()
      table.boolean('stripe_connect_charges_enabled').notNullable().defaultTo(false)
      table.boolean('stripe_connect_details_submitted').notNullable().defaultTo(false)
    })

    this.schema.alterTable('invoices', (table) => {
      table.string('payment_token', 64).nullable().unique()
      table.string('stripe_checkout_session_id', 255).nullable()
      table.string('stripe_payment_intent_id', 255).nullable()
    })
  }

  async down() {
    this.schema.alterTable('invoices', (table) => {
      table.dropColumn('stripe_payment_intent_id')
      table.dropColumn('stripe_checkout_session_id')
      table.dropColumn('payment_token')
    })

    this.schema.alterTable('organizations', (table) => {
      table.dropColumn('stripe_connect_details_submitted')
      table.dropColumn('stripe_connect_charges_enabled')
      table.dropColumn('stripe_connect_account_id')
    })
  }
}
