import { test } from '@japa/runner'
import emitter from '@adonisjs/core/services/emitter'
import { truncateDb } from '#tests/utils/db'
import Subscription from '#models/subscription'
import { createOrgWithStripeCustomer } from '#tests/functional/helpers'
import { swapStripeService } from '#tests/support/fakes'
import {
  PRICE_IDS,
  postStripeWebhook,
  stripeCheckoutSession,
  stripeCoupon,
  stripeDiscount,
  stripeEvent,
  stripePromotionCode,
  stripeSubscription,
} from '#tests/support/stripe'

/**
 * Persistance de la remise d'un abonnement par le webhook (#955).
 *
 * Un payload `customer.subscription.*` porte `discounts` en identifiants nus :
 * la synchro relit alors l'abonnement avec `expand` (via `swapStripeService`).
 * Un payload sans remise ne touche jamais Stripe (avant-dernier test), pas plus
 * qu'un abonnement résilié, même s'il porte encore des identifiants de remise
 * (dernier test) : c'est ce qui garde toutes les fixtures existantes hors réseau.
 */
const CUSTOMER = 'cus_discount_test'
const END = Math.floor(Date.UTC(2027, 2, 12) / 1000)

function discountedSubscription(
  id: string,
  discounts: Parameters<typeof stripeSubscription>[0]['discounts']
) {
  return stripeSubscription({ id, customer: CUSTOMER, priceId: PRICE_IDS.proMonth, discounts })
}

async function storedDiscount(organizationId: number) {
  const sub = await Subscription.query().where('organizationId', organizationId).firstOrFail()
  return {
    couponId: sub.discountCouponId,
    promoCode: sub.discountPromoCode,
    name: sub.discountName,
    percentOff: sub.discountPercentOff,
    amountOffCents: sub.discountAmountOffCents,
    currency: sub.discountCurrency,
    duration: sub.discountDuration,
    durationInMonths: sub.discountDurationInMonths,
    end: sub.discountEnd?.toISO() ?? null,
  }
}

test.group('Stripe webhook — subscription discount sync (functional)', (group) => {
  group.each.setup(() => truncateDb())
  group.each.setup(() => {
    emitter.fake()
    return () => emitter.restore()
  })

  test('an expanded discount on customer.subscription.updated is stored', async ({
    client,
    assert,
  }) => {
    const org = await createOrgWithStripeCustomer({ customerId: CUSTOMER })
    const discount = stripeDiscount({
      coupon: stripeCoupon({
        id: 'coupon_asso',
        name: 'Associations',
        percentOff: 50,
        duration: 'repeating',
        durationInMonths: 12,
      }),
      promotionCode: stripePromotionCode({ code: 'ASSO50' }),
      end: END,
    })

    const response = await postStripeWebhook(
      client,
      stripeEvent('customer.subscription.updated', discountedSubscription('sub_disc', [discount]))
    )

    response.assertStatus(200)
    assert.deepEqual(await storedDiscount(org.id), {
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

  test('a later event without discounts clears every discount column', async ({
    client,
    assert,
  }) => {
    const org = await createOrgWithStripeCustomer({ customerId: CUSTOMER })
    await postStripeWebhook(
      client,
      stripeEvent(
        'customer.subscription.updated',
        discountedSubscription('sub_disc', [stripeDiscount()]),
        'evt_with_discount'
      )
    )
    const before = await storedDiscount(org.id)
    assert.equal(before.couponId, 'coupon_test')

    const response = await postStripeWebhook(
      client,
      stripeEvent(
        'customer.subscription.updated',
        discountedSubscription('sub_disc', []),
        'evt_without_discount'
      )
    )

    response.assertStatus(200)
    assert.deepEqual(await storedDiscount(org.id), {
      couponId: null,
      promoCode: null,
      name: null,
      percentOff: null,
      amountOffCents: null,
      currency: null,
      duration: null,
      durationInMonths: null,
      end: null,
    })
  })

  test('unexpanded discount ids trigger a single re-read with expand', async ({
    client,
    assert,
    cleanup,
  }) => {
    const org = await createOrgWithStripeCustomer({ customerId: CUSTOMER })
    const stripe = swapStripeService({
      subscription: discountedSubscription('sub_disc', [
        stripeDiscount({
          coupon: stripeCoupon({ amountOff: 500, currency: 'eur', duration: 'once' }),
          promotionCode: null,
        }),
      ]),
    })
    cleanup(() => stripe.restore())

    const response = await postStripeWebhook(
      client,
      stripeEvent('customer.subscription.updated', discountedSubscription('sub_disc', ['di_1']))
    )

    response.assertStatus(200)
    assert.deepEqual(stripe.retrievedSubscriptionIds, ['sub_disc'])
    const stored = await storedDiscount(org.id)
    assert.equal(stored.amountOffCents, 500)
    assert.equal(stored.currency, 'eur')
    assert.equal(stored.duration, 'once')
    assert.isNull(stored.promoCode)
  })

  test('checkout.session.completed stores the discount of the fetched subscription', async ({
    client,
    assert,
    cleanup,
  }) => {
    const org = await createOrgWithStripeCustomer({ customerId: CUSTOMER })
    const stripe = swapStripeService({
      subscription: discountedSubscription('sub_checkout', [stripeDiscount()]),
    })
    cleanup(() => stripe.restore())

    const response = await postStripeWebhook(
      client,
      stripeEvent(
        'checkout.session.completed',
        stripeCheckoutSession({ customer: CUSTOMER, subscription: 'sub_checkout' })
      )
    )

    response.assertStatus(200)
    // Une seule lecture : l'abonnement relu porte déjà la remise développée.
    assert.deepEqual(stripe.retrievedSubscriptionIds, ['sub_checkout'])
    const stored = await storedDiscount(org.id)
    assert.equal(stored.couponId, 'coupon_test')
    assert.equal(stored.promoCode, 'BIENVENUE20')
    assert.equal(stored.percentOff, 20)
  })

  test('an active subscription without discounts never calls Stripe', async ({
    client,
    assert,
    cleanup,
  }) => {
    const org = await createOrgWithStripeCustomer({ customerId: CUSTOMER, plan: 'pro' })
    const stripe = swapStripeService()
    cleanup(() => stripe.restore())

    const response = await postStripeWebhook(
      client,
      stripeEvent('customer.subscription.updated', discountedSubscription('sub_plain', []))
    )

    response.assertStatus(200)
    assert.deepEqual(stripe.retrievedSubscriptionIds, [])
    const stored = await storedDiscount(org.id)
    assert.isNull(stored.couponId)
  })

  test('a canceled subscription never calls Stripe, even with discount ids, and keeps no discount', async ({
    client,
    assert,
    cleanup,
  }) => {
    const org = await createOrgWithStripeCustomer({ customerId: CUSTOMER, plan: 'pro' })
    const stripe = swapStripeService()
    cleanup(() => stripe.restore())

    const canceled = stripeSubscription({
      id: 'sub_disc',
      customer: CUSTOMER,
      priceId: PRICE_IDS.proMonth,
      status: 'canceled',
      discounts: ['di_1'],
    })
    const response = await postStripeWebhook(
      client,
      stripeEvent('customer.subscription.deleted', canceled)
    )

    response.assertStatus(200)
    assert.deepEqual(stripe.retrievedSubscriptionIds, [])
    const stored = await storedDiscount(org.id)
    assert.isNull(stored.couponId)
  })
})
