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

/** Moyens de paiement proposés sur une facture émise. */
export const INVOICE_PAYMENT_METHODS = [
  'cash',
  'card',
  'transfer',
  'check',
  'other',
] as const satisfies readonly InvoicePaymentMethod[]

export interface InvoiceLifecycleState {
  kind: InvoiceKind
  status: InvoiceStatus
}

/** Vrai pour une facture émise : une facture qui a quitté le brouillon. */
export function isIssuedInvoice(invoice: InvoiceLifecycleState): boolean {
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
 * facture émise et non annulée. Une facture annulée n'encaisse rien ; un
 * brouillon passe par le formulaire d'édition classique.
 */
export function canEditInvoicePayment(invoice: InvoiceLifecycleState): boolean {
  return isIssuedInvoice(invoice) && invoice.status !== 'cancelled'
}
