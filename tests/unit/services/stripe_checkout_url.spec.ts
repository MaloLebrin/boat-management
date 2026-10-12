import { test } from '@japa/runner'
import type Stripe from 'stripe'
import StripeService from '#services/stripe_service'
import { CheckoutSessionUrlMissingError } from '#exceptions/billing_errors'

/**
 * URL des sessions Checkout (#960) : Stripe la type `string | null`. Une
 * session sans URL lève une erreur métier portant son identifiant, au lieu de
 * renvoyer `null` vers une redirection.
 */
function serviceReturningSession(session: Partial<Stripe.Checkout.Session>): StripeService {
  const service = new StripeService()
  // Remplace le client Stripe (getter privé) : aucune clé API en test.
  Object.defineProperty(service, 'stripe', {
    value: { checkout: { sessions: { create: async () => session } } },
  })
  return service
}

const subscriptionCheckout = {
  customerId: 'cus_1',
  priceIds: ['price_test_pro_month'],
  successUrl: 'https://app.test/ok',
  cancelUrl: 'https://app.test/ko',
}

const invoiceCheckout = {
  accountId: 'acct_1',
  amountCents: 1000,
  currency: 'EUR',
  productName: 'Invoice',
  customerEmail: null,
  successUrl: 'https://app.test/ok',
  cancelUrl: 'https://app.test/ko',
  metadata: {},
}

test.group('StripeService checkout URL', () => {
  test('createCheckoutSession returns the session URL', async ({ assert }) => {
    const service = serviceReturningSession({ id: 'cs_1', url: 'https://checkout.stripe.test/1' })

    assert.equal(
      await service.createCheckoutSession(subscriptionCheckout),
      'https://checkout.stripe.test/1'
    )
  })

  test('createCheckoutSession throws when Stripe returns no URL', async ({ assert }) => {
    const service = serviceReturningSession({ id: 'cs_no_url', url: null })

    try {
      await service.createCheckoutSession(subscriptionCheckout)
      assert.fail('expected CheckoutSessionUrlMissingError')
    } catch (error) {
      assert.instanceOf(error, CheckoutSessionUrlMissingError)
      assert.equal((error as CheckoutSessionUrlMissingError).sessionId, 'cs_no_url')
      assert.include((error as Error).message, 'cs_no_url')
    }
  })

  test('createInvoiceCheckoutSession returns id and URL', async ({ assert }) => {
    const service = serviceReturningSession({ id: 'cs_2', url: 'https://checkout.stripe.test/2' })

    assert.deepEqual(await service.createInvoiceCheckoutSession(invoiceCheckout), {
      id: 'cs_2',
      url: 'https://checkout.stripe.test/2',
    })
  })

  test('createInvoiceCheckoutSession throws when Stripe returns no URL', async ({ assert }) => {
    const service = serviceReturningSession({ id: 'cs_no_url', url: null })

    await assert.rejects(
      () => service.createInvoiceCheckoutSession(invoiceCheckout),
      CheckoutSessionUrlMissingError
    )
  })
})
