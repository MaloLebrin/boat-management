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
