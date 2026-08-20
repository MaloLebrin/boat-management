import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
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

const PRO_MONTH = 'price_test_pro_month'
const PERIOD_START = Math.floor(Date.UTC(2030, 0, 10) / 1000)
const PERIOD_END = Math.floor(Date.UTC(2030, 1, 10) / 1000)

function fakeSub(customerId: string, priceId: string) {
  return {
    id: 'sub_upgrade_test',
    customer: customerId,
    status: 'active',
    cancel_at_period_end: false,
    billing_cycle_anchor: Math.floor(Date.UTC(2020, 0, 1) / 1000),
    items: {
      data: [
        {
          id: 'si_tier',
          price: { id: priceId, recurring: { interval: 'month', interval_count: 1 } },
          current_period_start: PERIOD_START,
          current_period_end: PERIOD_END,
        },
      ],
    },
  }
}

test.group('Plan upgrade — event dispatch (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

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
  group.each.setup(() => testUtils.db().truncate())

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
