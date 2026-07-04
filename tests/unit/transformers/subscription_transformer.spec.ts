import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { toSubscriptionInfo } from '#transformers/subscription_transformer'
import type Subscription from '#models/subscription'

function makeSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 1,
    status: 'active',
    planTier: 'pro',
    billingInterval: 'monthly',
    currentPeriodEnd: DateTime.fromISO('2026-08-04T10:00:00.000Z'),
    cancelAtPeriodEnd: false,
    ...overrides,
  } as unknown as Subscription
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
