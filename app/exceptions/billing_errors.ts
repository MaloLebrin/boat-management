export class StripeNotConfiguredError extends Error {
  name = 'StripeNotConfiguredError'
  constructor() {
    super(
      'Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in your environment.'
    )
  }
}

export class StripeCustomerError extends Error {
  name = 'StripeCustomerError'
  constructor(message: string) {
    super(message)
  }
}

/**
 * Un checkout demande des modules add-ons sur un socle qui ne les accepte pas
 * (épic #327) : les modules ne sont vendables que sur le socle Pro — Starter n'y
 * a pas droit et Enterprise les inclut déjà.
 */
export class ModulesRequireProPlanError extends Error {
  name = 'ModulesRequireProPlanError'
  constructor() {
    super('Add-on modules can only be subscribed on the Pro plan.')
  }
}

/**
 * Le toggle self-service d'un module `granted` (#353) n'est ouvert qu'aux
 * organisations Enterprise — Starter/Pro passent par `addModule`/`removeModule`
 * (souscription Stripe) et n'ont pas de module `granted` à basculer.
 */
export class ModulesRequireEnterprisePlanError extends Error {
  name = 'ModulesRequireEnterprisePlanError'
  constructor() {
    super('Included modules can only be toggled on the Enterprise plan.')
  }
}

/**
 * Paiement en ligne indisponible pour l'organisation (#876) : Stripe non
 * configuré sur l'instance, module Facturation inactif ou compte connecté
 * absent / pas encore activé par Stripe.
 */
export class OnlinePaymentsUnavailableError extends Error {
  name = 'OnlinePaymentsUnavailableError'
  constructor() {
    super('Online payments are not available for this organization.')
  }
}

/** La facture n'est pas (ou plus) payable en ligne : réglée, annulée, devis… (#876). */
export class InvoiceNotPayableError extends Error {
  name = 'InvoiceNotPayableError'
  constructor() {
    super('This invoice cannot be paid online.')
  }
}

/** Aucun lien de paiement ne correspond au jeton de `/pay/:token` (#876). */
export class PaymentLinkNotFoundError extends Error {
  name = 'PaymentLinkNotFoundError'
  constructor() {
    super('Payment link not found.')
  }
}
