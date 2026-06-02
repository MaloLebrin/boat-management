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
