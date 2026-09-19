import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * `invoices` : le moyen de paiement, et la remise en cohérence des `paid_at`
 * orphelins (#717).
 *
 * Une facture émise est désormais figée, à deux exceptions près décidées par le
 * propriétaire du produit : la **date** et le **moyen de paiement**. Le second
 * n'était pas modélisé — d'où la colonne `payment_method` (nullable, renseignée
 * au fil des règlements ; les factures déjà payées n'en portent aucun, ce qui
 * est exact : l'information n'a jamais été saisie).
 *
 * **Rattrapage** — jusqu'ici `update` ne touchait jamais `paid_at` : une facture
 * repassée en `draft`, `sent` ou `cancelled` gardait sa date de paiement, soit
 * une pièce comptable qui affirme avoir été réglée sans l'être. L'invariant posé
 * par cette issue est `paid_at is not null ⇔ status = 'paid'` ; les lignes qui le
 * violaient voient leur `paid_at` effacé. La réparation n'est pas rejouable en
 * sens inverse (la date perdue n'a pas de source), le `down()` se contente donc
 * de retirer la colonne.
 */
export default class extends BaseSchema {
  protected tableName = 'invoices'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('payment_method', 20).nullable()
    })

    this.defer(async (db) => {
      await db.from(this.tableName).whereNot('status', 'paid').update({ paid_at: null })
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('payment_method')
    })
  }
}
