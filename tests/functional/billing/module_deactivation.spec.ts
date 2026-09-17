import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import app from '@adonisjs/core/services/app'
import emitter from '@adonisjs/core/services/emitter'
import StripeService from '#services/stripe_service'
import SubscriptionService from '#services/subscription_service'
import OrganizationModuleService from '#services/organization_module_service'
import EmailQueueService from '#services/email_queue_service'
import OrganizationModuleDeactivated from '#events/organization_module_deactivated'
import OnOrganizationModuleDeactivated from '#listeners/on_organization_module_deactivated'
import Notification from '#models/notification'
import OrganizationModule from '#models/organization_module'
import OrganizationMembership from '#models/organization_membership'
import { UserFactory } from '#database/factories/user_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { PRICE_IDS, stripeSubscription, stripeSubscriptionItem } from '#tests/support/stripe'

const PRO_MONTH = PRICE_IDS.proMonth
const CHARTER_MONTH = PRICE_IDS.charterMonth

function item(id: string, priceId: string) {
  return stripeSubscriptionItem(priceId, { id })
}

function fakeSub(customerId: string, items: ReturnType<typeof item>[]) {
  return stripeSubscription({ id: 'sub_deact_test', customer: customerId, items })
}

function makeService() {
  return new SubscriptionService(new StripeService(), new OrganizationModuleService())
}

test.group('Module deactivation — event dispatch (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('removing a subscription module dispatches OrganizationModuleDeactivated', async ({
    assert,
    cleanup,
  }) => {
    const events = emitter.fake()
    cleanup(() => emitter.restore())

    const org = await OrganizationFactory.merge({ stripeCustomerId: 'cus_x', plan: 'pro' }).create()
    const service = makeService()

    // First sync activates charter…
    await service.syncFromSubscriptionEvent(
      fakeSub('cus_x', [item('si_tier', PRO_MONTH), item('si_charter', CHARTER_MONTH)]) as any
    )
    // …second sync drops it.
    await service.syncFromSubscriptionEvent(fakeSub('cus_x', [item('si_tier', PRO_MONTH)]) as any)

    const remaining = await OrganizationModule.query().where('organizationId', org.id)
    assert.lengthOf(remaining, 0)

    // Le module retiré (`charter`) est vérifié de bout en bout par le test du
    // listener plus bas (email/notification portant le bon module).
    events.assertEmitted(OrganizationModuleDeactivated)
  })

  test('a sync that removes nothing dispatches no deactivation event', async ({ cleanup }) => {
    const events = emitter.fake()
    cleanup(() => emitter.restore())

    await OrganizationFactory.merge({ stripeCustomerId: 'cus_y', plan: 'pro' }).create()

    await makeService().syncFromSubscriptionEvent(
      fakeSub('cus_y', [item('si_tier', PRO_MONTH), item('si_charter', CHARTER_MONTH)]) as any
    )

    events.assertNotEmitted(OrganizationModuleDeactivated)
  })
})

test.group('Module deactivation — listener (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('notifies every admin and enqueues an email', async ({ assert, cleanup }) => {
    const enqueued: Array<{ module: string; to: string }> = []
    app.container.swap(
      EmailQueueService,
      () =>
        ({
          sendModuleDeactivatedNotification: async (p: { module: string; to: string }) => {
            enqueued.push({ module: p.module, to: p.to })
          },
        }) as unknown as EmailQueueService
    )
    cleanup(() => app.container.restore(EmailQueueService))

    const org = await OrganizationFactory.create()
    const admin = await UserFactory.merge({ organizationId: org.id }).create()
    await OrganizationMembership.create({ userId: admin.id, organizationId: org.id, role: 'admin' })
    // A non-admin member must NOT be notified.
    const member = await UserFactory.merge({ organizationId: org.id }).create()
    await OrganizationMembership.create({
      userId: member.id,
      organizationId: org.id,
      role: 'member',
    })

    const listener = await app.container.make(OnOrganizationModuleDeactivated)
    await listener.handle(new OrganizationModuleDeactivated(org, 'charter'))

    const notifications = await Notification.query().where('organizationId', org.id)
    assert.lengthOf(notifications, 1)
    assert.equal(notifications[0].userId, admin.id)
    assert.equal(notifications[0].type, 'module.deactivated')

    assert.deepEqual(enqueued, [{ module: 'charter', to: admin.email }])
  })
})
