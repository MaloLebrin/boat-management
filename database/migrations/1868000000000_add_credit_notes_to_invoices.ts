import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Avoirs (notes de crédit, #877).
 *
 * - `invoices.kind` accepte `credit_note` : un avoir est une pièce de la même
 *   table, numérotée dans sa propre séquence (`AV-000001`, compteur
 *   `invoice_counters.kind = 'credit_note'`).
 * - `invoices.status` accepte `credited` : la facture entièrement avoirée.
 * - `invoices.credited_invoice_id` : la facture que l'avoir corrige. `RESTRICT`
 *   — une facture qui porte des avoirs ne se supprime pas, l'application le
 *   refuse avant d'arriver à la contrainte.
 *
 * Les colonnes `kind`/`status` sont des `enu` Knex, soit des contraintes CHECK
 * côté PostgreSQL : on les recrée avec les nouvelles valeurs.
 */
export default class extends BaseSchema {
  protected tableName = 'invoices'

  async up() {
    this.schema.raw('ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_kind_check')
    this.schema.raw(
      "ALTER TABLE invoices ADD CONSTRAINT invoices_kind_check CHECK (kind IN ('quote', 'invoice', 'credit_note'))"
    )
    this.schema.raw('ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check')
    this.schema.raw(
      "ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'credited'))"
    )

    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('credited_invoice_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('invoices')
        .onDelete('RESTRICT')
      table.index(['credited_invoice_id'])
    })
  }

  /**
   * Retour arrière destructif : les avoirs n'ont pas d'équivalent dans l'ancien
   * schéma. Ils sont supprimés et les factures avoirées reviennent à `sent`.
   */
  async down() {
    this.defer(async (db) => {
      await db.from(this.tableName).where('kind', 'credit_note').delete()
      await db.from(this.tableName).where('status', 'credited').update({ status: 'sent' })
      await db.from('invoice_counters').where('kind', 'credit_note').delete()
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['credited_invoice_id'])
      table.dropForeign(['credited_invoice_id'])
      table.dropColumn('credited_invoice_id')
    })

    this.schema.raw('ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_kind_check')
    this.schema.raw(
      "ALTER TABLE invoices ADD CONSTRAINT invoices_kind_check CHECK (kind IN ('quote', 'invoice'))"
    )
    this.schema.raw('ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check')
    this.schema.raw(
      "ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled'))"
    )
  }
}
