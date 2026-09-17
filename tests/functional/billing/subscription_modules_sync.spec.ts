import { test } from '@japa/runner'
import type Stripe from 'stripe'
import { truncateDb } from '#tests/utils/db'
import OrganizationModule from '#models/organization_module'
import Subscription from '#models/subscription'
import StripeService from '#services/stripe_service'
import SubscriptionService from '#services/subscription_service'
import OrganizationModuleService from '#services/organization_module_service'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { PRICE_IDS, stripeSubscription, stripeSubscriptionItem } from '#tests/support/stripe'

const PRO_MONTH = PRICE_IDS.proMonth
const CHARTER_MONTH = PRICE_IDS.charterMonth
const CRM_MONTH = PRICE_IDS.crmMonth

function item(id: string, priceId: string) {
  return stripeSubscriptionItem(priceId, { id })
}

function fakeSub(
  customerId: string,
  opts: { items: ReturnType<typeof item>[]; status?: Stripe.Subscription.Status }
) {
  return stripeSubscription({
    id: 'sub_modules_test',
    customer: customerId,
    items: opts.items,
    ...(opts.status ? { status: opts.status } : {}),
  })
}

function makeService() {
  return new SubscriptionService(new StripeService(), new OrganizationModuleService())
}

async function activeModules(organizationId: number): Promise<string[]> {
  const rows = await OrganizationModule.query()
    .where('organizationId', organizationId)
    .orderBy('module')
  return rows.map((r) => r.module)
}

test.group('SubscriptionService module reconciliation (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('a Pro subscription with a charter item activates the charter module', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.merge({
      stripeCustomerId: 'cus_a',
      plan: 'starter',
    }).create()

    await makeService().syncFromSubscriptionEvent(
      fakeSub('cus_a', {
        items: [item('si_tier', PRO_MONTH), item('si_charter', CHARTER_MONTH)],
      }) as any
    )

    await org.refresh()
    assert.equal(org.plan, 'pro')
    const row = await OrganizationModule.query()
      .where('organizationId', org.id)
      .where('module', 'charter')
      .firstOrFail()
    assert.equal(row.source, 'subscription')
    assert.equal(row.stripeSubscriptionItemId, 'si_charter')
  })

  test('multiple module items are all reconciled', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ stripeCustomerId: 'cus_b', plan: 'pro' }).create()

    await makeService().syncFromSubscriptionEvent(
      fakeSub('cus_b', {
        items: [
          item('si_tier', PRO_MONTH),
          item('si_charter', CHARTER_MONTH),
          item('si_crm', CRM_MONTH),
        ],
      }) as any
    )

    assert.deepEqual(await activeModules(org.id), ['charter', 'crm_invoicing'])
  })

  test('the tier item is resolved even when a module item comes first', async ({ assert }) => {
    const org = await OrganizationFactory.merge({
      stripeCustomerId: 'cus_c',
      plan: 'starter',
    }).create()

    await makeService().syncFromSubscriptionEvent(
      // module item at index 0, tier item second
      fakeSub('cus_c', {
        items: [item('si_charter', CHARTER_MONTH), item('si_tier', PRO_MONTH)],
      }) as any
    )

    await org.refresh()
    assert.equal(org.plan, 'pro')
    assert.deepEqual(await activeModules(org.id), ['charter'])
  })

  test('removing a module item revokes the module on the next sync', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ stripeCustomerId: 'cus_d', plan: 'pro' }).create()
    const service = makeService()

    await service.syncFromSubscriptionEvent(
      fakeSub('cus_d', {
        items: [item('si_tier', PRO_MONTH), item('si_charter', CHARTER_MONTH)],
      }) as any
    )
    assert.deepEqual(await activeModules(org.id), ['charter'])

    // Charter item dropped from the subscription
    await service.syncFromSubscriptionEvent(
      fakeSub('cus_d', { items: [item('si_tier', PRO_MONTH)] }) as any
    )
    assert.deepEqual(await activeModules(org.id), [])
  })

  test('a canceled subscription revokes every subscription module', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ stripeCustomerId: 'cus_e', plan: 'pro' }).create()
    const service = makeService()

    await service.syncFromSubscriptionEvent(
      fakeSub('cus_e', {
        items: [item('si_tier', PRO_MONTH), item('si_charter', CHARTER_MONTH)],
      }) as any
    )
    assert.deepEqual(await activeModules(org.id), ['charter'])

    await service.syncFromSubscriptionEvent(
      fakeSub('cus_e', {
        items: [item('si_tier', PRO_MONTH), item('si_charter', CHARTER_MONTH)],
        status: 'canceled',
      }) as any
    )

    await org.refresh()
    assert.equal(org.plan, 'starter')
    assert.deepEqual(await activeModules(org.id), [])
  })

  test('a granted module is never removed nor requalified by the sync', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ stripeCustomerId: 'cus_f', plan: 'pro' }).create()
    await new OrganizationModuleService().grantModule(org.id, 'crm_invoicing', {
      source: 'granted',
    })

    // Sync a Pro subscription WITHOUT the crm item: the granted module must survive.
    await makeService().syncFromSubscriptionEvent(
      fakeSub('cus_f', {
        items: [item('si_tier', PRO_MONTH), item('si_charter', CHARTER_MONTH)],
      }) as any
    )

    const crm = await OrganizationModule.query()
      .where('organizationId', org.id)
      .where('module', 'crm_invoicing')
      .firstOrFail()
    assert.equal(crm.source, 'granted')
    assert.isNull(crm.stripeSubscriptionItemId)
    assert.deepEqual(await activeModules(org.id), ['charter', 'crm_invoicing'])
  })

  test('period bounds come from the tier item even when a module item is first', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.merge({
      stripeCustomerId: 'cus_g',
      plan: 'starter',
    }).create()

    await makeService().syncFromSubscriptionEvent(
      fakeSub('cus_g', {
        items: [item('si_charter', CHARTER_MONTH), item('si_tier', PRO_MONTH)],
      }) as any
    )

    const sub = await Subscription.query().where('organizationId', org.id).firstOrFail()
    assert.equal(sub.stripePriceId, PRO_MONTH)
    assert.equal(sub.currentPeriodStart.toUTC().toISODate(), '2030-01-10')
    assert.equal(sub.currentPeriodEnd.toUTC().toISODate(), '2030-02-10')
  })
})
