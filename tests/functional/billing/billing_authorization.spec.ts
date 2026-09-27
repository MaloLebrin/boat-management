import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { truncateDb } from '#tests/utils/db'
import AuditLog from '#models/audit_log'
import Organization from '#models/organization'
import StripeService from '#services/stripe_service'
import OrganizationModuleService from '#services/organization_module_service'
import type User from '#models/user'
import {
  createAdminUser,
  createBoatOwnerUser,
  createMechanicUser,
  createMemberUser,
  seedActiveSubscription,
} from '#tests/functional/helpers'

/**
 * Les actions Stripe de `BillingController` sont réservées à
 * `subscription.manage` (#843). Avant, seules les deux actions Entreprise
 * passaient par le bouncer : un member, un mechanic ou un boat_owner pouvait
 * lancer un checkout, ouvrir le portail (et résilier), ajouter ou retirer des
 * modules payants et changer la quantité de bateaux supplémentaires.
 *
 * Chaque route est jouée sur une organisation où **tout** est en place pour
 * qu'elle parle à Stripe (abonnement actif, client Stripe, item de module) :
 * un refus qui ne tiendrait qu'à un prérequis manquant ne prouverait rien.
 */

/** Fake de `StripeService` qui enregistre chaque appel sortant. */
function swapRecordingStripe(): { calls: string[]; restore(): void } {
  const calls: string[] = []
  const record =
    <T>(name: string, value: T) =>
    async () => {
      calls.push(name)
      return value
    }
  app.container.swap(
    StripeService,
    () =>
      ({
        priceIdFor: () => 'price_plan',
        priceIdForModule: () => 'price_module',
        priceIdForAddon: () => 'price_addon',
        getOrCreateCustomer: record('getOrCreateCustomer', 'cus_test'),
        createCheckoutSession: record('createCheckoutSession', 'https://stripe.test/checkout'),
        createPortalSession: record('createPortalSession', 'https://stripe.test/portal'),
        addSubscriptionItem: record('addSubscriptionItem', undefined),
        removeSubscriptionItem: record('removeSubscriptionItem', undefined),
        updateSubscriptionItemQuantity: record('updateSubscriptionItemQuantity', undefined),
      }) as unknown as StripeService
  )
  return { calls, restore: () => app.container.restore(StripeService) }
}

interface BillingRoute {
  label: string
  method: 'post' | 'delete'
  url: string
  form: Record<string, string | number>
}

const ROUTES: BillingRoute[] = [
  {
    label: 'checkout',
    method: 'post',
    url: '/settings/billing/checkout',
    form: { planTier: 'enterprise', interval: 'month' },
  },
  { label: 'portal', method: 'post', url: '/settings/billing/portal', form: {} },
  {
    label: 'add module',
    method: 'post',
    url: '/settings/billing/module',
    form: { module: 'crm_invoicing' },
  },
  {
    label: 'remove module',
    method: 'delete',
    url: '/settings/billing/module',
    form: { module: 'charter' },
  },
  {
    label: 'set addon',
    method: 'post',
    url: '/settings/billing/addon',
    form: { addon: 'extra_boats', quantity: 5 },
  },
]

/** Organisation Pro abonnée, prête pour chacune des routes ci-dessus. */
async function setupBillableOrg(): Promise<User> {
  const admin = await createAdminUser()
  const orgId = admin.organizationId!
  const org = await Organization.findOrFail(orgId)
  org.stripeCustomerId = 'cus_existing'
  await org.save()
  await seedActiveSubscription(orgId)
  await new OrganizationModuleService().grantModule(orgId, 'charter', {
    source: 'subscription',
    stripeSubscriptionItemId: 'si_charter',
  })
  return admin
}

const NON_ADMIN_ROLES = [
  { role: 'member', create: createMemberUser },
  { role: 'mechanic', create: createMechanicUser },
  { role: 'boat_owner', create: createBoatOwnerUser },
] as const

test.group('Billing authorization (functional)', (group) => {
  group.each.setup(() => truncateDb())

  for (const { role, create } of NON_ADMIN_ROLES) {
    for (const route of ROUTES) {
      test(`a ${role} is refused on ${route.label} and nothing reaches Stripe`, async ({
        client,
        assert,
        cleanup,
      }) => {
        const stripe = swapRecordingStripe()
        cleanup(() => stripe.restore())
        const admin = await setupBillableOrg()
        const user = await create(admin.organizationId!)

        const response = await client[route.method](route.url)
          .loginAs(user)
          .form(route.form)
          .header('Accept', 'application/json')
          .redirects(0)

        response.assertStatus(403)
        assert.deepEqual(stripe.calls, [])
        assert.lengthOf(await AuditLog.query().where('action', 'like', 'billing.%'), 0)
      })
    }
  }

  test('an admin opens the portal and the action is audited', async ({
    client,
    assert,
    cleanup,
  }) => {
    const stripe = swapRecordingStripe()
    cleanup(() => stripe.restore())
    const admin = await setupBillableOrg()

    const response = await client.post('/settings/billing/portal').loginAs(admin).redirects(0)

    assert.notEqual(response.status(), 403)
    assert.deepEqual(stripe.calls, ['createPortalSession'])
    const log = await AuditLog.query().where('action', 'billing.portal').firstOrFail()
    assert.equal(log.userId, admin.id)
    assert.equal(log.organizationId, admin.organizationId)
  })

  test('an admin starts a checkout and the action is audited', async ({
    client,
    assert,
    cleanup,
  }) => {
    const stripe = swapRecordingStripe()
    cleanup(() => stripe.restore())
    const admin = await setupBillableOrg()

    const response = await client
      .post('/settings/billing/checkout')
      .loginAs(admin)
      .form({ planTier: 'enterprise', interval: 'month' })
      .redirects(0)

    assert.notEqual(response.status(), 403)
    assert.deepEqual(stripe.calls, ['getOrCreateCustomer', 'createCheckoutSession'])
    const log = await AuditLog.query().where('action', 'billing.checkout').firstOrFail()
    assert.deepEqual(log.metadata, { planTier: 'enterprise', interval: 'month', modules: [] })
  })

  test('an admin adds a module and the action is audited', async ({ client, assert, cleanup }) => {
    const stripe = swapRecordingStripe()
    cleanup(() => stripe.restore())
    const admin = await setupBillableOrg()

    const response = await client
      .post('/settings/billing/module')
      .loginAs(admin)
      .form({ module: 'crm_invoicing' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'success',
      'Module activated. It will appear once the payment is confirmed.'
    )
    assert.deepEqual(stripe.calls, ['addSubscriptionItem'])
    const log = await AuditLog.query().where('action', 'billing.module_add').firstOrFail()
    assert.deepEqual(log.metadata, { module: 'crm_invoicing' })
  })

  test('an admin removes a module and the action is audited', async ({
    client,
    assert,
    cleanup,
  }) => {
    const stripe = swapRecordingStripe()
    cleanup(() => stripe.restore())
    const admin = await setupBillableOrg()

    const response = await client
      .delete('/settings/billing/module')
      .loginAs(admin)
      .form({ module: 'charter' })
      .redirects(0)

    response.assertStatus(302)
    assert.deepEqual(stripe.calls, ['removeSubscriptionItem'])
    assert.lengthOf(await AuditLog.query().where('action', 'billing.module_remove'), 1)
  })

  test('an admin sets the extra boats addon and the action is audited', async ({
    client,
    assert,
    cleanup,
  }) => {
    const stripe = swapRecordingStripe()
    cleanup(() => stripe.restore())
    const admin = await setupBillableOrg()

    const response = await client
      .post('/settings/billing/addon')
      .loginAs(admin)
      .form({ addon: 'extra_boats', quantity: 5 })
      .redirects(0)

    response.assertStatus(302)
    assert.deepEqual(stripe.calls, ['addSubscriptionItem'])
    const log = await AuditLog.query().where('action', 'billing.addon_set').firstOrFail()
    assert.deepEqual(log.metadata, { addon: 'extra_boats', quantity: 5 })
  })
})
