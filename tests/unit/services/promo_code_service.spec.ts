import { test } from '@japa/runner'
import Stripe from 'stripe'
import {
  discountDetailsFromCoupon,
  discountFromStripe,
  evaluatePromotionCode,
  isPromotionRefusal,
} from '#services/promo_code_service'
import { stripeCoupon, stripeDiscount, stripePromotionCode } from '#tests/support/stripe'

/**
 * Pré-contrôle local d'un code promo (#955). Fonctions pures sur les objets
 * Stripe : aucun réseau, aucune base.
 */
const NOW = Math.floor(Date.UTC(2026, 9, 6) / 1000)

test.group('evaluatePromotionCode', () => {
  test('a valid percent code resolves to the promotion code id and coupon details', ({
    assert,
  }) => {
    const result = evaluatePromotionCode(stripePromotionCode(), NOW)

    assert.isTrue(result.ok)
    if (!result.ok) return
    assert.deepEqual(result.value, {
      promotionCodeId: 'promo_test',
      couponId: 'coupon_test',
      promoCode: 'BIENVENUE20',
      name: 'Bienvenue',
      percentOff: 20,
      amountOffCents: null,
      currency: null,
      duration: 'forever',
      durationInMonths: null,
    })
  })

  test('an amount coupon keeps its amount, currency and repeating duration', ({ assert }) => {
    const coupon = stripeCoupon({
      amountOff: 1000,
      currency: 'eur',
      duration: 'repeating',
      durationInMonths: 3,
    })
    const result = evaluatePromotionCode(stripePromotionCode({ coupon }), NOW)

    assert.isTrue(result.ok)
    if (!result.ok) return
    assert.equal(result.value.percentOff, null)
    assert.equal(result.value.amountOffCents, 1000)
    assert.equal(result.value.currency, 'eur')
    assert.equal(result.value.duration, 'repeating')
    assert.equal(result.value.durationInMonths, 3)
  })

  test('an inactive code, an invalid coupon or an unexpanded coupon read as notFound', ({
    assert,
  }) => {
    for (const promo of [
      stripePromotionCode({ active: false }),
      stripePromotionCode({ coupon: stripeCoupon({ valid: false }) }),
      stripePromotionCode({ coupon: 'coupon_not_expanded' }),
    ]) {
      assert.deepEqual(evaluatePromotionCode(promo, NOW), { ok: false, reason: 'notFound' })
    }
  })

  test('an invalid coupon says why: its own limit, its own deadline, or simply unknown', ({
    assert,
  }) => {
    const exhausted = stripeCoupon({ valid: false, maxRedemptions: 3, timesRedeemed: 3 })
    const expired = stripeCoupon({ valid: false, redeemBy: NOW - 1 })

    assert.deepEqual(evaluatePromotionCode(stripePromotionCode({ coupon: exhausted }), NOW), {
      ok: false,
      reason: 'exhausted',
    })
    assert.deepEqual(evaluatePromotionCode(stripePromotionCode({ coupon: expired }), NOW), {
      ok: false,
      reason: 'expired',
    })
    assert.deepEqual(
      evaluatePromotionCode(stripePromotionCode({ coupon: stripeCoupon({ valid: false }) }), NOW),
      { ok: false, reason: 'notFound' }
    )
  })

  test('a past expires_at reads as expired, a future one does not', ({ assert }) => {
    assert.deepEqual(evaluatePromotionCode(stripePromotionCode({ expiresAt: NOW - 1 }), NOW), {
      ok: false,
      reason: 'expired',
    })
    assert.isTrue(evaluatePromotionCode(stripePromotionCode({ expiresAt: NOW + 1 }), NOW).ok)
  })

  test('a redemption limit reached reads as exhausted', ({ assert }) => {
    assert.deepEqual(
      evaluatePromotionCode(stripePromotionCode({ maxRedemptions: 5, timesRedeemed: 5 }), NOW),
      { ok: false, reason: 'exhausted' }
    )
    assert.isTrue(
      evaluatePromotionCode(stripePromotionCode({ maxRedemptions: 5, timesRedeemed: 4 }), NOW).ok
    )
  })
})

test.group('isPromotionRefusal', () => {
  function invalidRequest(message: string, param?: string) {
    return new Stripe.errors.StripeInvalidRequestError({
      type: 'invalid_request_error',
      message,
      ...(param ? { param } : {}),
    })
  }

  test('a refusal that names the discount is a promo code problem', ({ assert }) => {
    assert.isTrue(isPromotionRefusal(invalidRequest('x', 'discounts[0][promotion_code]')))
    assert.isTrue(isPromotionRefusal(invalidRequest('This promotion code cannot be redeemed.')))
    assert.isTrue(isPromotionRefusal(invalidRequest('This coupon only applies to other products.')))
  })

  test('a price, customer or key problem is not', ({ assert }) => {
    assert.isFalse(isPromotionRefusal(invalidRequest('No such price: price_x', 'line_items')))
    assert.isFalse(isPromotionRefusal(invalidRequest('No such customer: cus_x', 'customer')))
    assert.isFalse(isPromotionRefusal(invalidRequest('Invalid API Key provided')))
  })
})

test.group('discountFromStripe', () => {
  test('maps the coupon, the promo code and the end date', ({ assert }) => {
    const end = Math.floor(Date.UTC(2027, 2, 12) / 1000)
    const discount = discountFromStripe(
      stripeDiscount({
        coupon: stripeCoupon({ percentOff: 50, duration: 'repeating', durationInMonths: 12 }),
        promotionCode: stripePromotionCode({ code: 'ASSO50' }),
        end,
      })
    )

    assert.isNotNull(discount)
    assert.equal(discount!.couponId, 'coupon_test')
    assert.equal(discount!.promoCode, 'ASSO50')
    assert.equal(discount!.percentOff, 50)
    assert.equal(discount!.duration, 'repeating')
    assert.equal(discount!.durationInMonths, 12)
    assert.equal(discount!.end!.toISO(), '2027-03-12T00:00:00.000+00:00')
  })

  test('a coupon applied without a promo code (or with an unexpanded one) has no code', ({
    assert,
  }) => {
    assert.equal(discountFromStripe(stripeDiscount({ promotionCode: null }))!.promoCode, null)
    assert.equal(
      discountFromStripe(stripeDiscount({ promotionCode: 'promo_not_expanded' }))!.promoCode,
      null
    )
  })

  test('an unexpanded coupon yields null — the caller must re-read with expand', ({ assert }) => {
    assert.isNull(discountFromStripe(stripeDiscount({ coupon: 'coupon_not_expanded' })))
  })

  test('discountDetailsFromCoupon defaults missing fields to null', ({ assert }) => {
    const details = discountDetailsFromCoupon(stripeCoupon({ name: null }), null)
    assert.equal(details.name, null)
    assert.equal(details.promoCode, null)
    assert.equal(details.amountOffCents, null)
  })
})
