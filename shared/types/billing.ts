import type { PlanModule, PlanTier } from './plan.js'

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'paused'

export type BillingInterval = 'month' | 'year'

export interface SubscriptionInfo {
  id: number
  status: SubscriptionStatus
  planTier: PlanTier
  billingInterval: BillingInterval
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

export interface CheckoutPayload {
  planTier: 'pro' | 'enterprise'
  interval: BillingInterval
  /** Modules add-ons souscrits à la souscription — Pro uniquement (épic #327). */
  modules?: PlanModule[]
}

/**
 * Une ligne du barème (`PLAN_PRICES`, `MODULE_PRICES`, `ADDON_PRICES`) telle
 * qu'elle doit exister dans le catalogue Stripe (#612). Le code affiche ces
 * montants, Stripe les facture : rien ne garantissait jusqu'ici qu'ils
 * concordent — c'est ainsi qu'un total annuel Entreprise de 950 € a pu être
 * annoncé alors que Stripe facturait 948.
 */
export interface ExpectedPrice {
  /** Libellé lisible, ex. `enterprise / year` ou `module charter / month`. */
  label: string
  /** Nom de la variable d'environnement portant l'identifiant de prix Stripe. */
  envVar: string
  /** Identifiant Stripe résolu, ou `null` si la variable n'est pas renseignée. */
  priceId: string | null
  /** Montant attendu en centimes — l'unité dans laquelle Stripe stocke les prix. */
  amountCents: number
  interval: BillingInterval
}

/** Nature de l'écart constaté entre le barème du code et le catalogue Stripe. */
export type PriceMismatchReason = 'amount' | 'currency' | 'interval' | 'inactive' | 'unreadable'

/** Écart constaté sur un prix, tel que rapporté par `pricing:check`. */
export interface PriceMismatch {
  label: string
  priceId: string
  reason: PriceMismatchReason
  expected: string
  actual: string
}

/** Résultat d'une confrontation complète du barème au catalogue Stripe. */
export interface PricingCheckReport {
  /** Prix effectivement lus chez Stripe et conformes. */
  matched: ExpectedPrice[]
  /** Prix non vérifiés faute d'identifiant configuré. */
  skipped: ExpectedPrice[]
  mismatches: PriceMismatch[]
}
