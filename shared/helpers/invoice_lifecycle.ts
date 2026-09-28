import type { InvoiceKind, InvoiceStatus, InvoicePaymentMethod } from '#shared/types/invoice'

/**
 * Règles de verrouillage d'une pièce comptable (#717).
 *
 * Une **facture émise** — `kind = 'invoice'` sortie du brouillon — est figée :
 * ses montants, son numéro, sa nature et sa date d'émission ne se réécrivent
 * plus. Seules la **date** et le **moyen de paiement** restent modifiables, via
 * la route dédiée `PATCH /invoices/:id/payment`.
 *
 * Restent librement modifiables : les **devis** (`kind = 'quote'`, quel que soit
 * leur statut — un devis n'est pas une pièce comptable) et les **factures encore
 * en brouillon**, qui n'ont pas été émises.
 *
 * Helpers purs, partagés backend ↔ frontend : le backend les fait respecter
 * (contrôleur + service), le frontend s'en sert pour masquer le bouton
 * « Modifier » et afficher le bloc paiement.
 */

/**
 * Moyens de paiement proposés à la saisie sur une facture émise. `online` en
 * est absent : il n'est posé que par un paiement Stripe confirmé (#876).
 */
export const INVOICE_PAYMENT_METHODS = [
  'cash',
  'card',
  'transfer',
  'check',
  'other',
] as const satisfies readonly InvoicePaymentMethod[]

export type ManualInvoicePaymentMethod = (typeof INVOICE_PAYMENT_METHODS)[number]

export interface InvoiceLifecycleState {
  kind: InvoiceKind
  status: InvoiceStatus
}

/**
 * Vrai pour une pièce émise : une facture qui a quitté le brouillon, ou un
 * avoir (#877) — toujours émis, jamais brouillon.
 */
export function isIssuedInvoice(invoice: InvoiceLifecycleState): boolean {
  if (invoice.kind === 'credit_note') return true
  return invoice.kind === 'invoice' && invoice.status !== 'draft'
}

/**
 * Vrai si le document accepte encore l'édition complète (lignes, montants,
 * dates, statut) — l'inverse de `isIssuedInvoice`.
 */
export function canEditInvoice(invoice: InvoiceLifecycleState): boolean {
  return !isIssuedInvoice(invoice)
}

/**
 * Vrai si les informations de paiement (date + moyen) sont modifiables : une
 * facture émise, ni annulée ni entièrement avoirée — l'une et l'autre
 * n'encaissent plus rien. Un brouillon passe par le formulaire d'édition
 * classique. Sur un avoir (#877), le « paiement » est le remboursement.
 */
export function canEditInvoicePayment(invoice: InvoiceLifecycleState): boolean {
  return isIssuedInvoice(invoice) && invoice.status !== 'cancelled' && invoice.status !== 'credited'
}

/**
 * Vrai si la facture accepte un avoir (#877) : une facture émise — envoyée,
 * en retard ou payée. Ni un devis, ni un brouillon (qui se corrige
 * directement), ni une facture annulée ou déjà entièrement avoirée.
 */
export function canIssueCreditNote(invoice: InvoiceLifecycleState): boolean {
  return (
    invoice.kind === 'invoice' &&
    (invoice.status === 'sent' || invoice.status === 'overdue' || invoice.status === 'paid')
  )
}

/** Arrondi au centime, pour comparer des sommes de montants décimaux. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

/** Montant TTC qu'un nouvel avoir peut encore retrancher de la facture. */
export function creditableRemaining(total: number, creditedTotal: number): number {
  return Math.max(0, roundMoney(total - creditedTotal))
}

export interface InvoiceBalanceState extends InvoiceLifecycleState {
  paidAt: unknown
  total: number | string
}

/**
 * Reste à régler d'une facture, net des avoirs (#877) : `0` pour ce qui n'est
 * pas une facture émise, pour une facture payée, annulée ou entièrement
 * avoirée. Une facture payée puis avoirée doit de l'argent au client : ce
 * remboursement se suit sur l'avoir, pas ici.
 */
export function invoiceBalanceDue(invoice: InvoiceBalanceState, creditedTotal: number): number {
  if (invoice.kind !== 'invoice') return 0
  if (invoice.status !== 'sent' && invoice.status !== 'overdue') return 0
  if (invoice.paidAt) return 0
  return creditableRemaining(Number(invoice.total), creditedTotal)
}

export interface InvoicePayableState extends InvoiceLifecycleState {
  paidAt: unknown
  total: number | string
}

/**
 * Vrai si la facture peut être réglée en ligne (#876) : une facture émise,
 * envoyée ou en retard, pas encore réglée et d'un montant positif. Un devis,
 * un brouillon, une facture annulée ou déjà payée ne s'encaissent pas.
 */
export function isInvoicePayableOnline(invoice: InvoicePayableState): boolean {
  return (
    invoice.kind === 'invoice' &&
    (invoice.status === 'sent' || invoice.status === 'overdue') &&
    !invoice.paidAt &&
    Number(invoice.total) > 0
  )
}
