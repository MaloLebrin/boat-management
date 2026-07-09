import { test } from '@japa/runner'
import StripeService from '#services/stripe_service'

/**
 * Mapping priceId ↔ module. Les IDs de prix factices proviennent de `.env.test`
 * (STRIPE_MODULE_*). `moduleForPriceId` / `priceIdForModule` ne touchent pas le
 * client Stripe, donc pas besoin de `STRIPE_SECRET_KEY`.
 */
test.group('StripeService module pricing', () => {
  test('moduleForPriceId maps monthly and annual module prices', ({ assert }) => {
    const service = new StripeService()

    assert.equal(service.moduleForPriceId('price_test_charter_month'), 'charter')
    assert.equal(service.moduleForPriceId('price_test_charter_year'), 'charter')
    assert.equal(service.moduleForPriceId('price_test_crm_month'), 'crm_invoicing')
    assert.equal(service.moduleForPriceId('price_test_crm_year'), 'crm_invoicing')
  })

  test('moduleForPriceId returns null for a tier price, unknown price or empty string', ({
    assert,
  }) => {
    const service = new StripeService()

    assert.isNull(service.moduleForPriceId('price_test_pro_month'))
    assert.isNull(service.moduleForPriceId('price_unknown'))
    assert.isNull(service.moduleForPriceId(''))
  })

  test('priceIdForModule returns the configured price for each interval', ({ assert }) => {
    const service = new StripeService()

    assert.equal(service.priceIdForModule('charter', 'month'), 'price_test_charter_month')
    assert.equal(service.priceIdForModule('charter', 'year'), 'price_test_charter_year')
    assert.equal(service.priceIdForModule('crm_invoicing', 'month'), 'price_test_crm_month')
    assert.equal(service.priceIdForModule('crm_invoicing', 'year'), 'price_test_crm_year')
  })

  test('priceIdForModule and moduleForPriceId are inverse of each other', ({ assert }) => {
    const service = new StripeService()

    for (const module of ['charter', 'crm_invoicing'] as const) {
      for (const interval of ['month', 'year'] as const) {
        const priceId = service.priceIdForModule(module, interval)
        assert.equal(service.moduleForPriceId(priceId), module)
      }
    }
  })

  test('moduleIdempotencyKey is deterministic per subscription + price', ({ assert }) => {
    const service = new StripeService()

    const key = service.moduleIdempotencyKey('sub_123', 'price_test_charter_month')
    assert.equal(key, 'add-module:sub_123:price_test_charter_month')
    // Same inputs → same key (a retry reuses it, Stripe dedupes the item).
    assert.equal(key, service.moduleIdempotencyKey('sub_123', 'price_test_charter_month'))
    // Different price → different key.
    assert.notEqual(key, service.moduleIdempotencyKey('sub_123', 'price_test_crm_month'))
  })
})
