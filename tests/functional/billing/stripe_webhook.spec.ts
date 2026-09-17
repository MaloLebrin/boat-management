import { test } from '@japa/runner'
import emitter from '@adonisjs/core/services/emitter'
import { truncateDb } from '#tests/utils/db'
import OrganizationModule from '#models/organization_module'
import Subscription from '#models/subscription'
import OrganizationModuleService from '#services/organization_module_service'
import OrganizationModuleDeactivated from '#events/organization_module_deactivated'
import OrganizationPlanDowngraded from '#events/organization_plan_downgraded'
import OrganizationPlanUpgraded from '#events/organization_plan_upgraded'
import { createOrgWithStripeCustomer } from '#tests/functional/helpers'
import { swapStripeService } from '#tests/support/fakes'
import {
  PRICE_IDS,
  postStripeWebhook,
  stripeCheckoutSession,
  stripeEvent,
  stripeSubscription,
  stripeSubscriptionItem,
} from '#tests/support/stripe'

/**
 * `POST /webhooks/stripe` (#698).
 *
 * C'est la seule route qui transforme un paiement réel en changement de plan,
 * elle est publique — aucun `middleware.auth`, aucun throttle — et sa seule
 * défense est la vérification de signature. Ces tests exercent la **vraie**
 * vérification (HMAC via `Stripe.webhooks`, secret factice de `.env.test`) :
 * la doubler reviendrait à ne pas tester ce qui protège la route.
 *
 * Aucun appel réseau : `customer.subscription.*` se résout entièrement depuis
 * le payload, et le seul appel distant du chemin — `retrieveSubscription` sur
 * `checkout.session.completed` — passe par `swapStripeService`.
 */

const CUSTOMER = 'cus_webhook_test'

function subscriptionEvent(
  type: 'customer.subscription.updated' | 'customer.subscription.deleted',
  options: Parameters<typeof stripeSubscription>[0],
  eventId?: string
) {
  return stripeEvent(type, stripeSubscription(options), eventId)
}

async function activeModules(organizationId: number): Promise<string[]> {
  const rows = await OrganizationModule.query()
    .where('organizationId', organizationId)
    .orderBy('module')
  return rows.map((row) => row.module)
}

test.group('Stripe webhook — signature (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('rejects a request without the stripe-signature header', async ({ client, assert }) => {
    const org = await createOrgWithStripeCustomer({ customerId: CUSTOMER })
    const event = subscriptionEvent('customer.subscription.updated', {
      customer: CUSTOMER,
      priceId: PRICE_IDS.proMonth,
    })

    const response = await postStripeWebhook(client, event, { signature: null })

    response.assertStatus(400)
    response.assertBodyContains({ error: 'Invalid signature' })

    await org.refresh()
    assert.equal(org.plan, 'starter')
    assert.isNull(await Subscription.query().where('organizationId', org.id).first())
  })

  test('rejects a forged signature', async ({ client, assert }) => {
    const org = await createOrgWithStripeCustomer({ customerId: CUSTOMER })
    const event = subscriptionEvent('customer.subscription.updated', {
      customer: CUSTOMER,
      priceId: PRICE_IDS.proMonth,
    })

    const response = await postStripeWebhook(client, event, {
      signature: 't=1700000000,v1=deadbeef',
    })

    response.assertStatus(400)
    await org.refresh()
    assert.equal(org.plan, 'starter')
  })

  test('rejects a body altered after signing', async ({ client, assert }) => {
    const org = await createOrgWithStripeCustomer({ customerId: CUSTOMER })
    const event = subscriptionEvent('customer.subscription.updated', {
      customer: CUSTOMER,
      priceId: PRICE_IDS.proMonth,
    })

    // Signature valide, corps différent : c'est le cas qui prouve que le HMAC
    // porte sur les octets du corps et pas seulement sur l'horodatage.
    const tampered = JSON.stringify({ ...event, id: 'evt_tampered' })
    const response = await postStripeWebhook(client, event, { payload: tampered })

    response.assertStatus(400)
    await org.refresh()
    assert.equal(org.plan, 'starter')
  })
})

test.group('Stripe webhook — subscription sync (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('customer.subscription.updated applies the Pro plan and stores the subscription', async ({
    client,
    assert,
    cleanup,
  }) => {
    const events = emitter.fake()
    cleanup(() => emitter.restore())

    const org = await createOrgWithStripeCustomer({ customerId: CUSTOMER })
    const event = subscriptionEvent('customer.subscription.updated', {
      id: 'sub_pro',
      customer: CUSTOMER,
      priceId: PRICE_IDS.proMonth,
    })

    const response = await postStripeWebhook(client, event)

    response.assertStatus(200)
    response.assertBodyContains({ received: true })

    await org.refresh()
    assert.equal(org.plan, 'pro')

    const subscription = await Subscription.query().where('organizationId', org.id).firstOrFail()
    assert.equal(subscription.stripeSubscriptionId, 'sub_pro')
    assert.equal(subscription.planTier, 'pro')
    assert.equal(subscription.status, 'active')
    assert.equal(subscription.billingInterval, 'month')

    events.assertEmitted(OrganizationPlanUpgraded)
  })

  test('an added charter item activates the module with its Stripe item id', async ({
    client,
    assert,
    cleanup,
  }) => {
    cleanup(() => emitter.restore())
    emitter.fake()

    const org = await createOrgWithStripeCustomer({ customerId: CUSTOMER })
    const event = subscriptionEvent('customer.subscription.updated', {
      id: 'sub_pro',
      customer: CUSTOMER,
      items: [
        stripeSubscriptionItem(PRICE_IDS.proMonth, { id: 'si_tier' }),
        stripeSubscriptionItem(PRICE_IDS.charterMonth, { id: 'si_charter' }),
      ],
    })

    const response = await postStripeWebhook(client, event)

    response.assertStatus(200)
    assert.deepEqual(await activeModules(org.id), ['charter'])

    const row = await OrganizationModule.query()
      .where('organizationId', org.id)
      .where('module', 'charter')
      .firstOrFail()
    assert.equal(row.source, 'subscription')
    assert.equal(row.stripeSubscriptionItemId, 'si_charter')
  })

  test('a later event without the charter item revokes it and notifies', async ({
    client,
    assert,
    cleanup,
  }) => {
    const events = emitter.fake()
    cleanup(() => emitter.restore())

    const org = await createOrgWithStripeCustomer({ customerId: CUSTOMER })

    await postStripeWebhook(
      client,
      subscriptionEvent('customer.subscription.updated', {
        id: 'sub_pro',
        customer: CUSTOMER,
        items: [
          stripeSubscriptionItem(PRICE_IDS.proMonth, { id: 'si_tier' }),
          stripeSubscriptionItem(PRICE_IDS.charterMonth, { id: 'si_charter' }),
        ],
      })
    )

    const response = await postStripeWebhook(
      client,
      subscriptionEvent(
        'customer.subscription.updated',
        {
          id: 'sub_pro',
          customer: CUSTOMER,
          priceId: PRICE_IDS.proMonth,
        },
        'evt_charter_removed'
      )
    )

    response.assertStatus(200)
    assert.deepEqual(await activeModules(org.id), [])
    events.assertEmitted(OrganizationModuleDeactivated)
  })

  test('customer.subscription.deleted downgrades to starter and drops the modules', async ({
    client,
    assert,
    cleanup,
  }) => {
    const events = emitter.fake()
    cleanup(() => emitter.restore())

    const org = await createOrgWithStripeCustomer({ customerId: CUSTOMER, plan: 'pro' })
    await new OrganizationModuleService().grantModule(org.id, 'charter', {
      source: 'subscription',
    })

    const response = await postStripeWebhook(
      client,
      subscriptionEvent('customer.subscription.deleted', {
        id: 'sub_pro',
        customer: CUSTOMER,
        priceId: PRICE_IDS.proMonth,
        status: 'canceled',
      })
    )

    response.assertStatus(200)
    await org.refresh()
    assert.equal(org.plan, 'starter')
    assert.deepEqual(await activeModules(org.id), [])
    events.assertEmitted(OrganizationPlanDowngraded)
  })

  test('a granted module survives a sync that does not carry it', async ({
    client,
    assert,
    cleanup,
  }) => {
    cleanup(() => emitter.restore())
    emitter.fake()

    const org = await createOrgWithStripeCustomer({ customerId: CUSTOMER })
    // Grandfathering : offert manuellement, donc insensible aux items Stripe.
    await new OrganizationModuleService().grantModule(org.id, 'crm_invoicing', {
      source: 'granted',
    })

    const response = await postStripeWebhook(
      client,
      subscriptionEvent('customer.subscription.updated', {
        id: 'sub_pro',
        customer: CUSTOMER,
        priceId: PRICE_IDS.proMonth,
      })
    )

    response.assertStatus(200)
    const row = await OrganizationModule.query()
      .where('organizationId', org.id)
      .where('module', 'crm_invoicing')
      .firstOrFail()
    assert.equal(row.source, 'granted')
  })
})

test.group('Stripe webhook — checkout and inert events (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('checkout.session.completed fetches the subscription and applies the plan', async ({
    client,
    assert,
    cleanup,
  }) => {
    cleanup(() => emitter.restore())
    emitter.fake()

    const org = await createOrgWithStripeCustomer({ customerId: CUSTOMER })
    const stripe = swapStripeService({
      subscription: stripeSubscription({
        id: 'sub_checkout',
        customer: CUSTOMER,
        priceId: PRICE_IDS.proMonth,
      }),
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
    assert.deepEqual(stripe.retrievedSubscriptionIds, ['sub_checkout'])

    await org.refresh()
    assert.equal(org.plan, 'pro')
    const subscription = await Subscription.query().where('organizationId', org.id).firstOrFail()
    assert.equal(subscription.stripeSubscriptionId, 'sub_checkout')
  })

  test('an unhandled event type is acknowledged without any side effect', async ({
    client,
    assert,
    cleanup,
  }) => {
    const events = emitter.fake()
    cleanup(() => emitter.restore())

    const org = await createOrgWithStripeCustomer({ customerId: CUSTOMER })

    const response = await postStripeWebhook(
      client,
      stripeEvent(
        'invoice.payment_failed',
        stripeSubscription({ customer: CUSTOMER, priceId: PRICE_IDS.proMonth })
      )
    )

    // Le `switch` de handleEvent n'a pas de `default` : l'événement est acquitté
    // pour que Stripe cesse de le rejouer, sans rien changer.
    response.assertStatus(200)
    response.assertBodyContains({ received: true })

    await org.refresh()
    assert.equal(org.plan, 'starter')
    assert.isNull(await Subscription.query().where('organizationId', org.id).first())
    // Ciblé plutôt que `assertNoneEmitted()` : une requête HTTP émet aussi des
    // événements de framework, qui ne disent rien du métier.
    events.assertNotEmitted(OrganizationPlanUpgraded)
    events.assertNotEmitted(OrganizationPlanDowngraded)
    events.assertNotEmitted(OrganizationModuleDeactivated)
  })

  test('an event for an unknown customer is acknowledged, not a 500', async ({
    client,
    assert,
  }) => {
    await createOrgWithStripeCustomer({ customerId: CUSTOMER })

    const response = await postStripeWebhook(
      client,
      subscriptionEvent('customer.subscription.updated', {
        customer: 'cus_never_seen',
        priceId: PRICE_IDS.proMonth,
      })
    )

    // Stripe envoie aussi les événements d'un compte qu'on ne connaît pas
    // (test/prod mélangés, organisation supprimée) : répondre 500 le ferait
    // rejouer indéfiniment.
    response.assertStatus(200)
    assert.lengthOf(await Subscription.all(), 0)
  })

  test('replaying the same event leaves the state unchanged', async ({
    client,
    assert,
    cleanup,
  }) => {
    cleanup(() => emitter.restore())
    emitter.fake()

    const org = await createOrgWithStripeCustomer({ customerId: CUSTOMER })
    const event = subscriptionEvent('customer.subscription.updated', {
      id: 'sub_pro',
      customer: CUSTOMER,
      priceId: PRICE_IDS.proMonth,
    })

    await postStripeWebhook(client, event)
    const response = await postStripeWebhook(client, event)

    // Stripe rejoue un webhook dès qu'il n'a pas reçu de 2xx à temps. Rien ne
    // déduplique sur `event.id` : c'est l'upsert (clé sur l'organisation) qui
    // rend la synchro rejouable.
    response.assertStatus(200)
    assert.lengthOf(await Subscription.query().where('organizationId', org.id), 1)

    await org.refresh()
    assert.equal(org.plan, 'pro')
  })
})
