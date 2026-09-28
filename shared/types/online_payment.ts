/**
 * Paiement en ligne des factures par le client final (#876) : compte Stripe
 * connecté de l'organisation (Stripe Connect) et page publique `/pay/:token`.
 */

/** État du compte Stripe connecté, tel que l'écran Facturation l'affiche. */
export type OnlinePaymentsAccountState = 'none' | 'pending' | 'active'

export interface OnlinePaymentsSettings {
  /** Stripe est configuré sur l'instance et le module Facturation est actif. */
  available: boolean
  state: OnlinePaymentsAccountState
  /** L'utilisateur peut connecter ou déconnecter le compte (`subscription.manage`). */
  canManage: boolean
}

/** État de la page publique de paiement. */
export type PublicInvoicePaymentState = 'payable' | 'paid' | 'unavailable'

/** Props de la page publique `/pay/:token` — rien de plus que ce que la facture montre. */
export interface PublicInvoicePayment {
  token: string
  state: PublicInvoicePaymentState
  organizationName: string
  number: string
  clientName: string | null
  total: number
  currency: string
  issuedAt: string | null
  dueAt: string | null
  /** Retour de Checkout (`?status=success`) : le webhook confirmera le paiement. */
  returnedFromCheckout: boolean
}

/** Métadonnées posées sur la session Checkout et relues par le webhook. */
export interface InvoiceCheckoutMetadata {
  invoice_id: string
  organization_id: string
}
