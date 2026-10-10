import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import {
  toSubscriptionDiscountInfo,
  toSubscriptionInfo,
} from '#transformers/subscription_transformer'
import type Subscription from '#models/subscription'

function makeSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 1,
    status: 'active',
    planTier: 'pro',
    billingInterval: 'monthly',
    currentPeriodEnd: DateTime.fromISO('2026-08-04T10:00:00.000Z'),
    cancelAtPeriodEnd: false,
    discountCouponId: null,
    discountPromoCode: null,
    discountName: null,
    discountPercentOff: null,
    discountAmountOffCents: null,
    discountCurrency: null,
    discountDuration: null,
    discountDurationInMonths: null,
    discountEnd: null,
    ...overrides,
  } as unknown as Subscription
}

const DISCOUNT_COLUMNS: Partial<Subscription> = {
  discountCouponId: 'coupon_asso',
  discountPromoCode: 'ASSO50',
  discountName: 'Associations',
  discountPercentOff: 50,
  discountAmountOffCents: null,
  discountCurrency: null,
  discountDuration: 'repeating',
  discountDurationInMonths: 12,
  discountEnd: DateTime.fromISO('2027-03-12T00:00:00.000Z'),
}

test.group('toSubscriptionInfo', () => {
  test('maps all fields on the happy path', ({ assert }) => {
    const sub = makeSubscription()
    const result = toSubscriptionInfo(sub)

    assert.equal(result.id, 1)
    assert.equal(result.status, 'active')
    assert.equal(result.planTier, 'pro')
    assert.equal(result.billingInterval, 'monthly')
    assert.isString(result.currentPeriodEnd)
    assert.isFalse(result.cancelAtPeriodEnd)
    assert.isNull(result.discount)
  })

  // #955 — la remise n'est exposée que quand un coupon est enregistré.
  test('discount columns are mapped with an ISO end date', ({ assert }) => {
    const result = toSubscriptionInfo(makeSubscription(DISCOUNT_COLUMNS))

    assert.deepEqual(result.discount, {
      couponId: 'coupon_asso',
      promoCode: 'ASSO50',
      name: 'Associations',
      percentOff: 50,
      amountOffCents: null,
      currency: null,
      duration: 'repeating',
      durationInMonths: 12,
      end: '2027-03-12T00:00:00.000+00:00',
    })
  })

  test('a forever discount has a null end', ({ assert }) => {
    const info = toSubscriptionDiscountInfo(
      makeSubscription({ ...DISCOUNT_COLUMNS, discountDuration: 'forever', discountEnd: null })
    )
    assert.equal(info?.duration, 'forever')
    assert.isNull(info?.end)
  })

  test('cancelAtPeriodEnd true is preserved', ({ assert }) => {
    const sub = makeSubscription({ cancelAtPeriodEnd: true })
    const result = toSubscriptionInfo(sub)
    assert.isTrue(result.cancelAtPeriodEnd)
  })

  test('currentPeriodEnd is ISO string', ({ assert }) => {
    const sub = makeSubscription()
    const result = toSubscriptionInfo(sub)
    assert.match(result.currentPeriodEnd!, /^\d{4}-\d{2}-\d{2}T/)
  })

  test('billingInterval yearly is preserved', ({ assert }) => {
    const sub = makeSubscription({ billingInterval: 'yearly' as Subscription['billingInterval'] })
    const result = toSubscriptionInfo(sub)
    assert.equal(result.billingInterval, 'yearly')
  })

  test('status trialing is preserved', ({ assert }) => {
    const sub = makeSubscription({ status: 'trialing' as Subscription['status'] })
    const result = toSubscriptionInfo(sub)
    assert.equal(result.status, 'trialing')
  })
})
