import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import app from '@adonisjs/core/services/app'
import emitter from '@adonisjs/core/services/emitter'
import StripeService from '#services/stripe_service'
import SubscriptionService from '#services/subscription_service'
import OrganizationModuleService from '#services/organization_module_service'
import OrganizationPlanUpgraded from '#events/organization_plan_upgraded'
import OnOrganizationPlanUpgraded from '#listeners/on_organization_plan_upgraded'
import Notification from '#models/notification'
import OrganizationMembership from '#models/organization_membership'
import { UserFactory } from '#database/factories/user_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { PRICE_IDS, stripeSubscription, stripeSubscriptionItem } from '#tests/support/stripe'

const PRO_MONTH = PRICE_IDS.proMonth

function fakeSub(customerId: string, priceId: string) {
  return stripeSubscription({
    id: 'sub_upgrade_test',
    customer: customerId,
    items: [stripeSubscriptionItem(priceId, { id: 'si_tier' })],
  })
}

test.group('Plan upgrade — event dispatch (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('upgrading starter → pro dispatches OrganizationPlanUpgraded', async ({
    assert,
    cleanup,
  }) => {
    const events = emitter.fake()
    cleanup(() => emitter.restore())

    const org = await OrganizationFactory.merge({
      stripeCustomerId: 'cus_upgrade',
      plan: 'starter',
    }).create()

    const service = new SubscriptionService(new StripeService(), new OrganizationModuleService())
    await service.syncFromSubscriptionEvent(fakeSub('cus_upgrade', PRO_MONTH) as any)

    await org.refresh()
    assert.equal(org.plan, 'pro')
    events.assertEmitted(OrganizationPlanUpgraded)
  })
})

test.group('Plan upgrade — listener (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('notifies every admin', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const admin = await UserFactory.merge({ organizationId: org.id }).create()
    await OrganizationMembership.create({ userId: admin.id, organizationId: org.id, role: 'admin' })
    const member = await UserFactory.merge({ organizationId: org.id }).create()
    await OrganizationMembership.create({
      userId: member.id,
      organizationId: org.id,
      role: 'member',
    })

    const listener = await app.container.make(OnOrganizationPlanUpgraded)
    await listener.handle(new OrganizationPlanUpgraded(org, 'starter', 'pro'))

    const notifications = await Notification.query().where('type', 'plan.upgraded')
    assert.lengthOf(notifications, 1)
    assert.equal(notifications[0].userId, admin.id)
    assert.equal(notifications[0].severity, 'success')
  })
})
