import { test } from '@japa/runner'
import type Stripe from 'stripe'
import { truncateDb } from '#tests/utils/db'
import OrganizationModule from '#models/organization_module'
import StripeService from '#services/stripe_service'
import SubscriptionService from '#services/subscription_service'
import OrganizationModuleService from '#services/organization_module_service'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { PRICE_IDS, stripeSubscription, stripeSubscriptionItem } from '#tests/support/stripe'

const PRO_MONTH = PRICE_IDS.proMonth
const EXTRA_BOATS_MONTH = PRICE_IDS.extraBoatsMonth

function item(id: string, priceId: string, quantity = 1) {
  return stripeSubscriptionItem(priceId, { id, quantity })
}

function fakeSub(
  customerId: string,
  opts: { items: ReturnType<typeof item>[]; status?: Stripe.Subscription.Status }
) {
  return stripeSubscription({
    id: 'sub_addon_test',
    customer: customerId,
    items: opts.items,
    ...(opts.status ? { status: opts.status } : {}),
  })
}

function makeService() {
  return new SubscriptionService(new StripeService(), new OrganizationModuleService())
}

async function extraBoatsRow(organizationId: number) {
  return OrganizationModule.query()
    .where('organizationId', organizationId)
    .where('module', 'extra_boats')
    .first()
}

test.group('SubscriptionService extra_boats add-on reconciliation (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('an extra_boats item activates the add-on with its Stripe quantity', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ stripeCustomerId: 'cus_x', plan: 'pro' }).create()

    await makeService().syncFromSubscriptionEvent(
      fakeSub('cus_x', {
        items: [item('si_tier', PRO_MONTH), item('si_boats', EXTRA_BOATS_MONTH, 4)],
      }) as any
    )

    const row = await extraBoatsRow(org.id)
    assert.isNotNull(row)
    assert.equal(row!.source, 'subscription')
    assert.equal(row!.quantity, 4)
    assert.equal(row!.stripeSubscriptionItemId, 'si_boats')
  })

  test('a changed Stripe quantity is reflected on the next sync', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ stripeCustomerId: 'cus_y', plan: 'pro' }).create()
    const service = makeService()

    await service.syncFromSubscriptionEvent(
      fakeSub('cus_y', {
        items: [item('si_tier', PRO_MONTH), item('si_boats', EXTRA_BOATS_MONTH, 2)],
      }) as any
    )
    assert.equal((await extraBoatsRow(org.id))!.quantity, 2)

    await service.syncFromSubscriptionEvent(
      fakeSub('cus_y', {
        items: [item('si_tier', PRO_MONTH), item('si_boats', EXTRA_BOATS_MONTH, 7)],
      }) as any
    )
    assert.equal((await extraBoatsRow(org.id))!.quantity, 7)
  })

  test('removing the extra_boats item revokes the add-on', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ stripeCustomerId: 'cus_z', plan: 'pro' }).create()
    const service = makeService()

    await service.syncFromSubscriptionEvent(
      fakeSub('cus_z', {
        items: [item('si_tier', PRO_MONTH), item('si_boats', EXTRA_BOATS_MONTH, 3)],
      }) as any
    )
    assert.isNotNull(await extraBoatsRow(org.id))

    await service.syncFromSubscriptionEvent(
      fakeSub('cus_z', { items: [item('si_tier', PRO_MONTH)] }) as any
    )
    assert.isNull(await extraBoatsRow(org.id))
  })
})
