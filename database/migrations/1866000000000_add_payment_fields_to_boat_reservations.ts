import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Suivi de l'argent d'une location (#875) : acompte, solde et caution.
 *
 * - `deposit_amount` : acompte attendu — rempli à la confirmation (30 % du
 *   prix par défaut), modifiable au moment de l'encaissement ;
 * - `paid_amount` : total encaissé, `payment_status` en dérive
 *   (`unpaid` → `deposit_paid` → `paid`, ou `refunded`) ;
 * - `payment_method` : moyen du dernier encaissement ;
 * - `security_deposit_*` : caution copiée du tarif du bateau à la
 *   confirmation, puis bloquée (`held`), restituée (`released`) ou retenue
 *   (`retained`, montant et motif) au retour.
 *
 * Suivi manuel : le paiement en ligne est une issue séparée (#876).
 */
export default class extends BaseSchema {
  protected tableName = 'boat_reservations'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.decimal('deposit_amount', 10, 2).nullable()
      table.timestamp('deposit_paid_at', { useTz: true }).nullable()
      table.timestamp('balance_paid_at', { useTz: true }).nullable()
      table.decimal('paid_amount', 10, 2).notNullable().defaultTo(0)
      table.string('payment_status', 20).notNullable().defaultTo('unpaid')
      table.string('payment_method', 20).nullable()
      table.decimal('security_deposit_amount', 10, 2).nullable()
      table.string('security_deposit_status', 20).notNullable().defaultTo('none')
      table.decimal('security_deposit_retained_amount', 10, 2).nullable()
      table.text('security_deposit_note').nullable()
    })

    this.schema.raw(`
      ALTER TABLE "boat_reservations"
      ADD CONSTRAINT "boat_reservations_payment_status_check"
      CHECK (payment_status IN ('unpaid','deposit_paid','paid','refunded')),
      ADD CONSTRAINT "boat_reservations_payment_method_check"
      CHECK (payment_method IS NULL OR payment_method IN ('transfer','card','cash','check')),
      ADD CONSTRAINT "boat_reservations_security_deposit_status_check"
      CHECK (security_deposit_status IN ('none','held','released','retained'))
    `)
  }

  async down() {
    this.schema.raw(`
      ALTER TABLE "boat_reservations"
      DROP CONSTRAINT IF EXISTS "boat_reservations_payment_status_check",
      DROP CONSTRAINT IF EXISTS "boat_reservations_payment_method_check",
      DROP CONSTRAINT IF EXISTS "boat_reservations_security_deposit_status_check"
    `)
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('deposit_amount')
      table.dropColumn('deposit_paid_at')
      table.dropColumn('balance_paid_at')
      table.dropColumn('paid_amount')
      table.dropColumn('payment_status')
      table.dropColumn('payment_method')
      table.dropColumn('security_deposit_amount')
      table.dropColumn('security_deposit_status')
      table.dropColumn('security_deposit_retained_amount')
      table.dropColumn('security_deposit_note')
    })
  }
}
