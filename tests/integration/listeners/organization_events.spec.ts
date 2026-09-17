import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import Notification from '#models/notification'
import OrganizationMembership from '#models/organization_membership'
import OrganizationMemberJoined from '#events/organization_member_joined'
import OrganizationPlanDowngraded from '#events/organization_plan_downgraded'
import OnOrganizationMemberJoined from '#listeners/on_organization_member_joined'
import OnOrganizationPlanDowngraded from '#listeners/on_organization_plan_downgraded'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { UserFactory } from '#database/factories/user_factory'

/**
 * Listeners d'organisation (#699).
 *
 * Les événements métier sont émis puis oubliés : rien, côté appelant, ne
 * constate qu'un listener a fait son travail. Un `handle()` qui ne notifierait
 * plus personne ne casserait aucun test, et le seul symptôme serait un silence
 * — celui d'un admin qui n'apprend pas qu'un membre a rejoint son organisation,
 * ou que son plan a été rétrogradé.
 *
 * On vérifie donc l'**effet observable** : une ligne en base, et pour qui.
 */

async function orgWithAdmins(adminCount: number) {
  const org = await OrganizationFactory.create()
  const admins = []

  for (let index = 0; index < adminCount; index++) {
    const user = await UserFactory.merge({ organizationId: org.id }).create()
    await OrganizationMembership.create({ userId: user.id, organizationId: org.id, role: 'admin' })
    admins.push(user)
  }

  return { org, admins }
}

test.group('OnOrganizationMemberJoined', () => {
  test('every admin is notified when a member joins', async ({ assert }) => {
    const { org, admins } = await orgWithAdmins(2)
    const newcomer = await UserFactory.merge({ organizationId: org.id }).create()
    const membership = await OrganizationMembership.create({
      userId: newcomer.id,
      organizationId: org.id,
      role: 'member',
    })

    const listener = await app.container.make(OnOrganizationMemberJoined)
    await listener.handle(new OrganizationMemberJoined(membership, org))

    const notified = await Notification.query()
      .where('organizationId', org.id)
      .where('type', 'member.joined')

    assert.sameMembers(
      notified.map((notification) => notification.userId),
      admins.map((admin) => admin.id)
    )
  })

  test('an admin who joins is not notified of their own arrival', async ({ assert }) => {
    // `filter((admin) => admin.userId !== event.member.userId)` — sans ce filtre,
    // le premier admin d'une organisation recevrait une notification pour
    // lui-même à la création du compte.
    const org = await OrganizationFactory.create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()
    const membership = await OrganizationMembership.create({
      userId: user.id,
      organizationId: org.id,
      role: 'admin',
    })

    const listener = await app.container.make(OnOrganizationMemberJoined)
    await listener.handle(new OrganizationMemberJoined(membership, org))

    assert.lengthOf(await Notification.query().where('userId', user.id), 0)
  })

  test('a member of another organization is never notified', async ({ assert }) => {
    const { org } = await orgWithAdmins(1)
    const outsiderOrg = await OrganizationFactory.create()
    const outsider = await UserFactory.merge({ organizationId: outsiderOrg.id }).create()
    await OrganizationMembership.create({
      userId: outsider.id,
      organizationId: outsiderOrg.id,
      role: 'admin',
    })

    const newcomer = await UserFactory.merge({ organizationId: org.id }).create()
    const membership = await OrganizationMembership.create({
      userId: newcomer.id,
      organizationId: org.id,
      role: 'member',
    })

    const listener = await app.container.make(OnOrganizationMemberJoined)
    await listener.handle(new OrganizationMemberJoined(membership, org))

    assert.lengthOf(await Notification.query().where('userId', outsider.id), 0)
  })
})

test.group('OnOrganizationPlanDowngraded', () => {
  test('every admin gets a notification when the plan is downgraded', async ({ assert }) => {
    const { org, admins } = await orgWithAdmins(2)

    const listener = await app.container.make(OnOrganizationPlanDowngraded)
    await listener.handle(new OrganizationPlanDowngraded(org, 'enterprise', 'pro'))

    const notified = await Notification.query().where('organizationId', org.id)

    assert.sameMembers(
      notified.map((notification) => notification.userId),
      admins.map((admin) => admin.id)
    )
  })

  test('an organization without an admin produces nothing, and does not throw', async ({
    assert,
  }) => {
    // Cas réel : une organisation dont le dernier admin vient d'être retiré.
    // Le listener doit rester silencieux, pas planter la file.
    const org = await OrganizationFactory.create()

    const listener = await app.container.make(OnOrganizationPlanDowngraded)
    await listener.handle(new OrganizationPlanDowngraded(org, 'pro', 'starter'))

    assert.lengthOf(await Notification.query().where('organizationId', org.id), 0)
  })
})
