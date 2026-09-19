import { test } from '@japa/runner'
import emitter from '@adonisjs/core/services/emitter'
import { truncateDb } from '#tests/utils/db'
import OrganizationModule from '#models/organization_module'
import Subscription from '#models/subscription'
import ProcessedStripeEvent from '#models/processed_stripe_event'
import OrganizationModuleService from '#services/organization_module_service'
import OrganizationModuleDeactivated from '#events/organization_module_deactivated'
import OrganizationPlanDowngraded from '#events/organization_plan_downgraded'
import OrganizationPlanUpgraded from '#events/organization_plan_upgraded'
import { createOrgWithStripeCustomer } from '#tests/functional/helpers'
import { swapCountingSubscriptionService, swapStripeService } from '#tests/support/fakes'
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

/**
 * Déduplication par `event.id` (#703).
 *
 * Stripe livre **au moins une fois**, jamais exactement une fois : il rejoue à
 * chaque réponse non-2xx, et parfois même après un 2xx. Rien ne gardait trace
 * des événements déjà traités, et chaque livraison était rejouée intégralement.
 *
 * Si le rejeu était jusqu'ici inoffensif, c'était par **effet de bord** :
 * l'upsert de synchro, clé sur l'organisation, réécrivait les mêmes valeurs.
 * D'où la forme de ces tests — ils comptent ce qui **atteint** la synchro,
 * plutôt que de comparer l'état final. Un état final identique ne distingue pas
 * « rien n'a été fait » de « la même chose a été refaite », et c'est exactement
 * la différence que la déduplication apporte : la moindre écriture non
 * idempotente ajoutée au chemin de synchro serait dupliquée par le rejeu sans
 * qu'un test d'état final ne bronche.
 */
test.group('Stripe webhook — déduplication par event.id (functional, #703)', (group) => {
  group.each.setup(() => truncateDb())

  test('replaying the same event id never reaches the sync a second time', async ({
    client,
    assert,
    cleanup,
  }) => {
    cleanup(() => emitter.restore())
    emitter.fake()

    const org = await createOrgWithStripeCustomer({ customerId: CUSTOMER })
    const sync = await swapCountingSubscriptionService()
    cleanup(() => sync.restore())

    const event = subscriptionEvent(
      'customer.subscription.updated',
      { id: 'sub_pro', customer: CUSTOMER, priceId: PRICE_IDS.proMonth },
      'evt_dedup'
    )

    const first = await postStripeWebhook(client, event)
    const second = await postStripeWebhook(client, event)

    first.assertStatus(200)
    // Le rejeu est acquitté comme une livraison neuve : Stripe n'a pas à savoir
    // que l'événement avait déjà été vu, il attend seulement un 2xx.
    second.assertStatus(200)
    second.assertBodyContains({ received: true })

    // Le cœur du test : la synchro n'a été atteinte qu'une fois.
    assert.equal(sync.calls.subscriptionEvent, 1)

    // Et le premier passage a bien fait son travail — sans quoi « une seule
    // fois » serait vrai en n'ayant rien fait du tout.
    await org.refresh()
    assert.equal(org.plan, 'pro')
    assert.lengthOf(await ProcessedStripeEvent.all(), 1)
  })

  test('two different event ids are both processed', async ({ client, assert, cleanup }) => {
    cleanup(() => emitter.restore())
    emitter.fake()

    await createOrgWithStripeCustomer({ customerId: CUSTOMER })
    const sync = await swapCountingSubscriptionService()
    cleanup(() => sync.restore())

    // Témoin : la garde déduplique sur `event.id`, pas sur le contenu. Deux
    // événements distincts portant le même abonnement doivent tous deux passer,
    // sans quoi une annulation suivant une mise à jour serait avalée.
    await postStripeWebhook(
      client,
      subscriptionEvent(
        'customer.subscription.updated',
        { id: 'sub_pro', customer: CUSTOMER, priceId: PRICE_IDS.proMonth },
        'evt_first'
      )
    )
    await postStripeWebhook(
      client,
      subscriptionEvent(
        'customer.subscription.updated',
        { id: 'sub_pro', customer: CUSTOMER, priceId: PRICE_IDS.proMonth },
        'evt_second'
      )
    )

    assert.equal(sync.calls.subscriptionEvent, 2)
    assert.lengthOf(await ProcessedStripeEvent.all(), 2)
  })

  test('an event whose processing fails is not marked as processed', async ({
    client,
    assert,
    cleanup,
  }) => {
    cleanup(() => emitter.restore())
    emitter.fake()

    const org = await createOrgWithStripeCustomer({ customerId: CUSTOMER })
    const sync = await swapCountingSubscriptionService({ failFirstCall: true })
    cleanup(() => sync.restore())

    const event = subscriptionEvent(
      'customer.subscription.updated',
      { id: 'sub_pro', customer: CUSTOMER, priceId: PRICE_IDS.proMonth },
      'evt_retry'
    )

    // Première livraison : la synchro échoue, la transaction est annulée — donc
    // la trace aussi. C'est tout l'intérêt d'écrire la trace **dans** la
    // transaction de synchro : commitée à part, elle marquerait l'événement
    // traité alors qu'il ne l'a pas été, et Stripe ne le rejouerait jamais.
    const failed = await postStripeWebhook(client, event)
    assert.equal(failed.status(), 500)
    assert.lengthOf(await ProcessedStripeEvent.all(), 0)

    // Le rejeu de Stripe aboutit.
    const retried = await postStripeWebhook(client, event)
    retried.assertStatus(200)

    assert.equal(sync.calls.subscriptionEvent, 2)
    await org.refresh()
    assert.equal(org.plan, 'pro')
    assert.lengthOf(await ProcessedStripeEvent.all(), 1)
  })

  test('an unhandled event type is recorded too, so its replay costs nothing', async ({
    client,
    assert,
    cleanup,
  }) => {
    cleanup(() => emitter.restore())
    emitter.fake()

    await createOrgWithStripeCustomer({ customerId: CUSTOMER })

    const event = stripeEvent(
      'invoice.payment_failed',
      stripeSubscription({ customer: CUSTOMER, priceId: PRICE_IDS.proMonth }),
      'evt_unhandled'
    )

    const response = await postStripeWebhook(client, event)
    response.assertStatus(200)

    const recorded = await ProcessedStripeEvent.all()
    assert.lengthOf(recorded, 1)
    // Le type est conservé pour le diagnostic : savoir *quoi* a été rejoué sans
    // rouvrir les logs Stripe.
    assert.equal(recorded[0].type, 'invoice.payment_failed')
    assert.equal(recorded[0].stripeEventId, 'evt_unhandled')
  })

  test('a signature failure records nothing — the event was never read', async ({
    client,
    assert,
  }) => {
    await createOrgWithStripeCustomer({ customerId: CUSTOMER })

    const response = await postStripeWebhook(
      client,
      subscriptionEvent(
        'customer.subscription.updated',
        { customer: CUSTOMER, priceId: PRICE_IDS.proMonth },
        'evt_forged'
      ),
      { signature: 't=1700000000,v1=deadbeef' }
    )

    response.assertStatus(400)
    // La déduplication vient **après** la vérification de signature : un
    // `event.id` choisi par un tiers ne doit pas pouvoir bloquer la livraison
    // légitime qui portera le même id.
    assert.lengthOf(await ProcessedStripeEvent.all(), 0)
  })
})

/**
 * Abonnement sans aucun item (#704).
 *
 * `resolveTierItem` se terminait par un repli `?? items.data[0]` : sur un
 * `items.data` vide il rendait `undefined` — sans que son type de retour le
 * dise —, et l'appelant déréférençait `item.price.id`. `TypeError`, remontée en
 * **500**. Or un 5xx est, pour Stripe, une livraison échouée : l'événement
 * était rejoué indéfiniment, puisqu'il produisait toujours la même erreur.
 *
 * Le cas n'est pas théorique : un abonnement dont le dernier item vient d'être
 * retiré arrive avec `items.data` vide.
 *
 * Ces tests prouvent le refus **explicite** : 200 (l'événement a été reçu et
 * compris, rien à en faire) et aucune écriture — pas « écrit la même chose ».
 */
test.group('Stripe webhook — abonnement sans item (functional, #704)', (group) => {
  group.each.setup(() => truncateDb())

  test('customer.subscription.updated with no items is acknowledged without touching anything', async ({
    client,
    assert,
    cleanup,
  }) => {
    const org = await createOrgWithStripeCustomer({ customerId: CUSTOMER })

    // État de départ réel : un abonnement Pro déjà synchronisé. Sans lui, un
    // « aucune ligne touchée » ne prouverait rien — il n'y aurait rien à
    // toucher.
    await postStripeWebhook(
      client,
      subscriptionEvent('customer.subscription.updated', {
        id: 'sub_pro',
        customer: CUSTOMER,
        priceId: PRICE_IDS.proMonth,
      })
    )
    const before = await Subscription.query().where('organizationId', org.id).firstOrFail()

    const events = emitter.fake()
    cleanup(() => emitter.restore())

    const response = await postStripeWebhook(
      client,
      subscriptionEvent('customer.subscription.updated', {
        id: 'sub_pro',
        customer: CUSTOMER,
        items: [],
      })
    )

    // 200 et non 400 : un rejeu ne peut pas faire apparaître d'item, le faire
    // rejouer ne ferait qu'accumuler les livraisons sur un événement
    // intraitable.
    response.assertStatus(200)
    response.assertBodyContains({ received: true })

    await org.refresh()
    assert.equal(org.plan, 'pro')

    const after = await Subscription.query().where('organizationId', org.id).firstOrFail()
    assert.equal(after.planTier, before.planTier)
    assert.equal(after.stripePriceId, before.stripePriceId)
    assert.equal(after.status, before.status)
    // La preuve que la ligne n'a pas été réécrite à l'identique : `updated_at`
    // aurait bougé.
    assert.equal(after.updatedAt.toISO(), before.updatedAt.toISO())
    assert.lengthOf(await Subscription.all(), 1)

    events.assertNotEmitted(OrganizationPlanUpgraded)
    events.assertNotEmitted(OrganizationPlanDowngraded)
    events.assertNotEmitted(OrganizationModuleDeactivated)
  })

  test('customer.subscription.deleted with no items does not downgrade on a guess', async ({
    client,
    assert,
    cleanup,
  }) => {
    const org = await createOrgWithStripeCustomer({ customerId: CUSTOMER })

    await postStripeWebhook(
      client,
      subscriptionEvent('customer.subscription.updated', {
        id: 'sub_pro',
        customer: CUSTOMER,
        priceId: PRICE_IDS.proMonth,
      })
    )

    const events = emitter.fake()
    cleanup(() => emitter.restore())

    const response = await postStripeWebhook(
      client,
      subscriptionEvent('customer.subscription.deleted', {
        id: 'sub_pro',
        customer: CUSTOMER,
        status: 'canceled',
        items: [],
      })
    )

    // Comportement assumé, pas un oubli : un abonnement sans item ne décrit
    // aucun plan, et une annulation se traite sur l'événement qui porte ses
    // items. L'organisation reste donc sur son plan — c'est pourquoi le service
    // logge ce cas en `warn` et non en `info`.
    response.assertStatus(200)
    await org.refresh()
    assert.equal(org.plan, 'pro')
    events.assertNotEmitted(OrganizationPlanDowngraded)
  })

  test('checkout.session.completed on an itemless subscription writes nothing', async ({
    client,
    assert,
    cleanup,
  }) => {
    const org = await createOrgWithStripeCustomer({ customerId: CUSTOMER })
    const stripe = swapStripeService({
      subscription: stripeSubscription({ id: 'sub_empty', customer: CUSTOMER, items: [] }),
    })
    cleanup(() => stripe.restore())

    const response = await postStripeWebhook(
      client,
      stripeEvent(
        'checkout.session.completed',
        stripeCheckoutSession({ customer: CUSTOMER, subscription: 'sub_empty' })
      )
    )

    response.assertStatus(200)
    // L'abonnement a bien été lu chez Stripe : la sortie a lieu après, sur son
    // contenu, et non sur un court-circuit en amont.
    assert.deepEqual(stripe.retrievedSubscriptionIds, ['sub_empty'])

    await org.refresh()
    assert.equal(org.plan, 'starter')
    assert.lengthOf(await Subscription.all(), 0)
  })
})

/**
 * Un `sub_…` déjà rattaché à une autre organisation (#705).
 *
 * `subscriptions` porte deux clés d'unicité — `organization_id` et
 * `stripe_subscription_id` — et l'upsert de synchro n'est clé que sur la
 * première. Si un abonnement rattaché à l'organisation A arrive sur
 * l'organisation B (abonnement déplacé d'un client à l'autre côté Stripe,
 * `stripe_customer_id` réattribué, deux organisations créées depuis le même
 * client), l'upsert ne trouvait rien sur `organizationId = B`, tentait un
 * `INSERT`, et PostgreSQL rejetait sur la seconde contrainte : **500**, donc
 * rejeu Stripe indéfini sur un conflit qu'aucun rejeu ne résoudra.
 *
 * Le conflit est désormais détecté avant l'écriture, dans la transaction.
 */
test.group('Stripe webhook — abonnement rattaché ailleurs (functional, #705)', (group) => {
  group.each.setup(() => truncateDb())

  const OTHER_CUSTOMER = 'cus_webhook_other'
  const SHARED_SUB = 'sub_shared'

  /**
   * Organisation A, porteuse de `sub_shared` en Pro.
   *
   * L'événement d'amorçage porte son **propre** `event.id` : depuis la
   * déduplication de #703, réutiliser `evt_test` ferait écarter l'événement que
   * chaque test poste ensuite — la garde d'appartenance ne serait jamais
   * atteinte, et les cas « rien n'a été écrit » passeraient pour la mauvaise
   * raison.
   */
  async function seedHolder(client: Parameters<typeof postStripeWebhook>[0]) {
    const holder = await createOrgWithStripeCustomer({ customerId: CUSTOMER })
    await postStripeWebhook(
      client,
      subscriptionEvent(
        'customer.subscription.updated',
        {
          id: SHARED_SUB,
          customer: CUSTOMER,
          priceId: PRICE_IDS.proMonth,
        },
        'evt_seed_holder'
      )
    )
    return holder
  }

  test('an event moving the subscription to another organization is acknowledged, not a 500', async ({
    client,
    assert,
    cleanup,
  }) => {
    const holder = await seedHolder(client)
    const claimant = await createOrgWithStripeCustomer({ customerId: OTHER_CUSTOMER })
    const before = await Subscription.query().where('organizationId', holder.id).firstOrFail()

    const events = emitter.fake()
    cleanup(() => emitter.restore())

    const response = await postStripeWebhook(
      client,
      subscriptionEvent('customer.subscription.updated', {
        id: SHARED_SUB,
        customer: OTHER_CUSTOMER,
        priceId: PRICE_IDS.proMonth,
      })
    )

    // 200 : le rejeu ne résoudra jamais un conflit d'attribution. Avant #705,
    // la violation de contrainte remontait brute en 500 et Stripe rejouait.
    response.assertStatus(200)
    response.assertBodyContains({ received: true })

    // Aucune ligne créée pour l'organisation revendiquante, aucun plan accordé.
    await claimant.refresh()
    assert.equal(claimant.plan, 'starter')
    assert.isNull(await Subscription.query().where('organizationId', claimant.id).first())
    assert.lengthOf(await Subscription.all(), 1)

    // L'abonnement de l'organisation A est intact, pas seulement « équivalent ».
    await holder.refresh()
    assert.equal(holder.plan, 'pro')
    const after = await Subscription.query().where('organizationId', holder.id).firstOrFail()
    assert.equal(after.id, before.id)
    assert.equal(after.stripeSubscriptionId, SHARED_SUB)
    assert.equal(after.planTier, 'pro')
    assert.equal(after.updatedAt.toISO(), before.updatedAt.toISO())

    events.assertNotEmitted(OrganizationPlanUpgraded)
    events.assertNotEmitted(OrganizationPlanDowngraded)
  })

  test('the modules of the claiming organization are left alone', async ({
    client,
    assert,
    cleanup,
  }) => {
    await seedHolder(client)
    const claimant = await createOrgWithStripeCustomer({ customerId: OTHER_CUSTOMER, plan: 'pro' })
    await new OrganizationModuleService().grantModule(claimant.id, 'charter', {
      source: 'granted',
    })

    cleanup(() => emitter.restore())
    emitter.fake()

    const response = await postStripeWebhook(
      client,
      subscriptionEvent('customer.subscription.updated', {
        id: SHARED_SUB,
        customer: OTHER_CUSTOMER,
        items: [
          stripeSubscriptionItem(PRICE_IDS.proMonth, { id: 'si_tier' }),
          stripeSubscriptionItem(PRICE_IDS.crmMonth, { id: 'si_crm' }),
        ],
      })
    )

    response.assertStatus(200)
    // La réconciliation des modules vit dans la même transaction que l'upsert :
    // la garde doit court-circuiter les deux, pas seulement l'écriture de
    // `subscriptions`. Sans quoi un conflit d'attribution activerait quand même
    // le module CRM porté par l'événement.
    assert.deepEqual(await activeModules(claimant.id), ['charter'])
  })

  test('the holding organization keeps syncing its own subscription', async ({
    client,
    assert,
    cleanup,
  }) => {
    const holder = await seedHolder(client)
    await createOrgWithStripeCustomer({ customerId: OTHER_CUSTOMER })

    cleanup(() => emitter.restore())
    emitter.fake()

    // Le chemin normal ne doit pas être gêné par la garde : c'est la même
    // organisation, la ligne existante est la sienne.
    const response = await postStripeWebhook(
      client,
      subscriptionEvent('customer.subscription.updated', {
        id: SHARED_SUB,
        customer: CUSTOMER,
        priceId: PRICE_IDS.enterpriseMonth,
      })
    )

    response.assertStatus(200)
    await holder.refresh()
    assert.equal(holder.plan, 'enterprise')
    const subscription = await Subscription.query().where('organizationId', holder.id).firstOrFail()
    assert.equal(subscription.planTier, 'enterprise')
    assert.lengthOf(await Subscription.all(), 1)
  })

  test('checkout.session.completed on a subscription held elsewhere writes nothing', async ({
    client,
    assert,
    cleanup,
  }) => {
    const holder = await seedHolder(client)
    const claimant = await createOrgWithStripeCustomer({ customerId: OTHER_CUSTOMER })

    const stripe = swapStripeService({
      subscription: stripeSubscription({
        id: SHARED_SUB,
        customer: OTHER_CUSTOMER,
        priceId: PRICE_IDS.proMonth,
      }),
    })
    cleanup(() => stripe.restore())

    const response = await postStripeWebhook(
      client,
      stripeEvent(
        'checkout.session.completed',
        stripeCheckoutSession({ customer: OTHER_CUSTOMER, subscription: SHARED_SUB })
      )
    )

    response.assertStatus(200)
    await claimant.refresh()
    assert.equal(claimant.plan, 'starter')
    assert.lengthOf(await Subscription.all(), 1)
    const held = await Subscription.query().where('organizationId', holder.id).firstOrFail()
    assert.equal(held.planTier, 'pro')
  })
})
