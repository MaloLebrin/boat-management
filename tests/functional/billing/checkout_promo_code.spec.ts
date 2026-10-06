import { test } from '@japa/runner'
import Stripe from 'stripe'
import { truncateDb } from '#tests/utils/db'
import AuditLog from '#models/audit_log'
import { createAdminUser } from '#tests/functional/helpers'
import { swapCheckoutStripeService } from '#tests/support/fakes'
import { assertFieldErrors, assertNoFieldErrors, inertiaErrors } from '#tests/support/validation'
import { stripeCoupon, stripePromotionCode } from '#tests/support/stripe'

/**
 * Code promo au checkout (#955). Le code est résolu chez Stripe **avant** la
 * session : un refus est une erreur de champ (`promoCode`) et n'ouvre rien ;
 * un code valide est transmis en `discounts` via `promotionCodeId`.
 */
test.group('Billing checkout — promo code (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('a valid code is pre-applied to the Checkout session and audited', async ({
    client,
    assert,
    cleanup,
  }) => {
    const stripe = swapCheckoutStripeService({
      promotionCode: stripePromotionCode({ id: 'promo_valid', code: 'BIENVENUE20' }),
    })
    cleanup(() => stripe.restore())
    const admin = await createAdminUser('starter')

    const response = await client
      .post('/settings/billing/checkout')
      .loginAs(admin)
      .form({ planTier: 'pro', interval: 'month', promoCode: 'bienvenue20' })
      .redirects(0)

    // `inertia.location` : 409 + X-Inertia-Location vers Stripe.
    assert.oneOf(response.status(), [409, 302])
    assert.deepEqual(stripe.promotionCodeLookups, ['bienvenue20'])
    assert.lengthOf(stripe.checkoutSessions, 1)
    assert.equal(stripe.checkoutSessions[0].promotionCodeId, 'promo_valid')

    const log = await AuditLog.query().where('action', 'billing.checkout').firstOrFail()
    assert.deepEqual(log.metadata, {
      planTier: 'pro',
      interval: 'month',
      modules: [],
      promoCode: 'BIENVENUE20',
    })
  })

  test('without a promo code nothing changes: no lookup, no discount, same audit metadata', async ({
    client,
    assert,
    cleanup,
  }) => {
    const stripe = swapCheckoutStripeService()
    cleanup(() => stripe.restore())
    const admin = await createAdminUser('starter')

    await client
      .post('/settings/billing/checkout')
      .loginAs(admin)
      .form({ planTier: 'pro', interval: 'month' })
      .redirects(0)

    assert.deepEqual(stripe.promotionCodeLookups, [])
    assert.lengthOf(stripe.checkoutSessions, 1)
    assert.isUndefined(stripe.checkoutSessions[0].promotionCodeId)

    const log = await AuditLog.query().where('action', 'billing.checkout').firstOrFail()
    assert.deepEqual(log.metadata, { planTier: 'pro', interval: 'month', modules: [] })
  })

  test('an unknown code is a field error and opens no session', async ({
    client,
    assert,
    cleanup,
  }) => {
    const stripe = swapCheckoutStripeService({ promotionCode: null })
    cleanup(() => stripe.restore())
    const admin = await createAdminUser('starter')

    const response = await client
      .post('/settings/billing/checkout')
      .loginAs(admin)
      .form({ planTier: 'pro', interval: 'month', promoCode: 'NOPE' })
      .redirects(0)

    assertFieldErrors(assert, response, ['promoCode'])
    assert.equal(
      inertiaErrors(response).promoCode[0],
      'This promo code is unknown or no longer active.'
    )
    assert.lengthOf(stripe.checkoutSessions, 0)
    assert.isNull(await AuditLog.query().where('action', 'billing.checkout').first())
  })

  test('an expired or exhausted code names the reason under the field', async ({
    client,
    assert,
    cleanup,
  }) => {
    const admin = await createAdminUser('starter')
    const cases = [
      { promo: stripePromotionCode({ expiresAt: 1 }), message: 'This promo code has expired.' },
      {
        promo: stripePromotionCode({ maxRedemptions: 1, timesRedeemed: 1 }),
        message: 'This promo code has reached its redemption limit.',
      },
      {
        promo: stripePromotionCode({ coupon: stripeCoupon({ valid: false }) }),
        message: 'This promo code is unknown or no longer active.',
      },
    ]

    for (const { promo, message } of cases) {
      const stripe = swapCheckoutStripeService({ promotionCode: promo })
      cleanup(() => stripe.restore())

      const response = await client
        .post('/settings/billing/checkout')
        .loginAs(admin)
        .form({ planTier: 'pro', interval: 'month', promoCode: 'X' })
        .redirects(0)

      assertFieldErrors(assert, response, ['promoCode'])
      assert.equal(inertiaErrors(response).promoCode[0], message)
      assert.lengthOf(stripe.checkoutSessions, 0)
      stripe.restore()
    }
  })

  test('a restriction only Stripe can check is reported as not applicable', async ({
    client,
    assert,
    cleanup,
  }) => {
    const stripe = swapCheckoutStripeService({
      promotionCode: stripePromotionCode(),
      checkoutError: new Stripe.errors.StripeInvalidRequestError({
        type: 'invalid_request_error',
        message: 'This promotion code cannot be redeemed because the customer…',
      }),
    })
    cleanup(() => stripe.restore())
    const admin = await createAdminUser('starter')

    const response = await client
      .post('/settings/billing/checkout')
      .loginAs(admin)
      .form({ planTier: 'pro', interval: 'month', promoCode: 'FIRSTONLY' })
      .redirects(0)

    assertFieldErrors(assert, response, ['promoCode'])
    assert.equal(
      inertiaErrors(response).promoCode[0],
      'This promo code cannot be applied to this subscription.'
    )
  })

  test('a Stripe refusal unrelated to a promo code still surfaces as an error', async ({
    client,
    assert,
    cleanup,
  }) => {
    const stripe = swapCheckoutStripeService({
      checkoutError: new Stripe.errors.StripeInvalidRequestError({
        type: 'invalid_request_error',
        message: 'No such price',
      }),
    })
    cleanup(() => stripe.restore())
    const admin = await createAdminUser('starter')

    const response = await client
      .post('/settings/billing/checkout')
      .loginAs(admin)
      .form({ planTier: 'pro', interval: 'month' })
      .redirects(0)

    assert.isAtLeast(response.status(), 500)
  })

  test('a code longer than 64 characters is rejected by validation before Stripe', async ({
    client,
    assert,
    cleanup,
  }) => {
    const stripe = swapCheckoutStripeService({ promotionCode: stripePromotionCode() })
    cleanup(() => stripe.restore())
    const admin = await createAdminUser('starter')

    const response = await client
      .post('/settings/billing/checkout')
      .loginAs(admin)
      .form({ planTier: 'pro', interval: 'month', promoCode: 'A'.repeat(65) })
      .redirects(0)

    assertFieldErrors(assert, response, ['promoCode'])
    assert.deepEqual(stripe.promotionCodeLookups, [])

    const ok = await client
      .post('/settings/billing/checkout')
      .loginAs(admin)
      .form({ planTier: 'pro', interval: 'month', promoCode: '  OK  ' })
      .redirects(0)
    assertNoFieldErrors(assert, ok)
    assert.deepEqual(stripe.promotionCodeLookups, ['OK'])
  })
})
