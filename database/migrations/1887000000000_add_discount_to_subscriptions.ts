import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Remise active sur l'abonnement (#955).
 *
 * Le webhook recopie ici le coupon porté par l'abonnement Stripe (code promo
 * saisi au checkout ou coupon posé depuis le Dashboard) pour que la page
 * Facturation l'affiche sans rappeler Stripe. Toutes les colonnes sont
 * nullables : un abonnement sans remise les laisse à `null`, et le retrait de
 * la remise les remet à `null`.
 *
 * `discount_percent_off` est un `float` et non un `decimal` : Lucid génère
 * `string` pour `numeric`, alors qu'un pourcentage se manipule en nombre.
 */
export default class extends BaseSchema {
  protected tableName = 'subscriptions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('discount_coupon_id').nullable()
      table.string('discount_promo_code').nullable()
      table.string('discount_name').nullable()
      table.float('discount_percent_off').nullable()
      table.integer('discount_amount_off_cents').nullable()
      table.string('discount_currency', 3).nullable()
      table.enu('discount_duration', ['forever', 'once', 'repeating']).nullable()
      table.integer('discount_duration_in_months').nullable()
      table.timestamp('discount_end').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumns(
        'discount_coupon_id',
        'discount_promo_code',
        'discount_name',
        'discount_percent_off',
        'discount_amount_off_cents',
        'discount_currency',
        'discount_duration',
        'discount_duration_in_months',
        'discount_end'
      )
    })
  }
}
