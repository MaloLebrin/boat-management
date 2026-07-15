import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import app from '@adonisjs/core/services/app'
import emitter from '@adonisjs/core/services/emitter'
import Notification from '#models/notification'
import OrganizationMembership from '#models/organization_membership'
import OrganizationMemberService from '#services/organization_member_service'
import OrganizationMemberRemoved from '#events/organization_member_removed'
import OrganizationMemberRoleChanged from '#events/organization_member_role_changed'
import OrganizationInvitationAccepted from '#events/organization_invitation_accepted'
import OnOrganizationMemberRemoved from '#listeners/on_organization_member_removed'
import OnOrganizationMemberRoleChanged from '#listeners/on_organization_member_role_changed'
import OnOrganizationInvitationAccepted from '#listeners/on_organization_invitation_accepted'
import { UserFactory } from '#database/factories/user_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'

async function orgWithAdmin() {
  const org = await OrganizationFactory.create()
  const admin = await UserFactory.merge({ organizationId: org.id }).create()
  await OrganizationMembership.create({ userId: admin.id, organizationId: org.id, role: 'admin' })
  return { org, admin }
}

test.group('Member notifications — listeners (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('member.removed notifies remaining admins and the removed user', async ({ assert }) => {
    const { org, admin } = await orgWithAdmin()
    const removed = await UserFactory.merge({ organizationId: org.id }).create()

    const listener = await app.container.make(OnOrganizationMemberRemoved)
    await listener.handle(new OrganizationMemberRemoved(org, removed.id, 'John Doe'))

    const notifications = await Notification.query()
      .where('type', 'member.removed')
      .orderBy('userId', 'asc')
    assert.lengthOf(notifications, 2)

    const forAdmin = notifications.find((n) => n.userId === admin.id)
    const forRemoved = notifications.find((n) => n.userId === removed.id)
    assert.exists(forAdmin)
    assert.equal(forAdmin!.actionUrl, '/settings/members')
    assert.exists(forRemoved)
    // Le membre retiré n'a plus accès au panneau membres.
    assert.isNull(forRemoved!.actionUrl)
  })

  test('member.role_changed notifies the affected member and admins', async ({ assert }) => {
    const { org, admin } = await orgWithAdmin()
    const target = await UserFactory.merge({ organizationId: org.id }).create()
    await OrganizationMembership.create({
      userId: target.id,
      organizationId: org.id,
      role: 'member',
    })

    const listener = await app.container.make(OnOrganizationMemberRoleChanged)
    await listener.handle(
      new OrganizationMemberRoleChanged(org, target.id, 'Jane Doe', 'member', 'admin')
    )

    const notifications = await Notification.query().where('type', 'member.role_changed')
    assert.lengthOf(notifications, 2)
    assert.isTrue(notifications.some((n) => n.userId === target.id))
    assert.isTrue(notifications.some((n) => n.userId === admin.id))
  })

  test('invitation.accepted notifies the inviter', async ({ assert }) => {
    const { org, admin } = await orgWithAdmin()

    const listener = await app.container.make(OnOrganizationInvitationAccepted)
    await listener.handle(new OrganizationInvitationAccepted(org, admin.id, 'New Member'))

    const notifications = await Notification.query().where('type', 'invitation.accepted')
    assert.lengthOf(notifications, 1)
    assert.equal(notifications[0].userId, admin.id)
  })

  test('invitation.accepted with no inviter creates no notification', async ({ assert }) => {
    const { org } = await orgWithAdmin()

    const listener = await app.container.make(OnOrganizationInvitationAccepted)
    await listener.handle(new OrganizationInvitationAccepted(org, null, 'New Member'))

    const notifications = await Notification.query().where('type', 'invitation.accepted')
    assert.lengthOf(notifications, 0)
  })
})

test.group('Member service — event dispatch (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('removeMember dispatches OrganizationMemberRemoved after commit', async ({ cleanup }) => {
    const events = emitter.fake()
    cleanup(() => emitter.restore())

    const org = await OrganizationFactory.create()
    // Two admins so removing one does not hit the last-admin guard.
    const keep = await UserFactory.merge({ organizationId: org.id }).create()
    await OrganizationMembership.create({ userId: keep.id, organizationId: org.id, role: 'admin' })
    const drop = await UserFactory.merge({ organizationId: org.id }).create()
    const dropMembership = await OrganizationMembership.create({
      userId: drop.id,
      organizationId: org.id,
      role: 'admin',
    })

    await new OrganizationMemberService().removeMember(dropMembership.id, org.id)

    events.assertEmitted(OrganizationMemberRemoved)
  })

  test('updateRole dispatches only when the role actually changes', async ({ cleanup }) => {
    const events = emitter.fake()
    cleanup(() => emitter.restore())

    const org = await OrganizationFactory.create()
    const member = await UserFactory.merge({ organizationId: org.id }).create()
    const membership = await OrganizationMembership.create({
      userId: member.id,
      organizationId: org.id,
      role: 'member',
    })

    // No-op: same role → no event.
    await new OrganizationMemberService().updateRole(membership.id, org.id, 'member')
    events.assertNotEmitted(OrganizationMemberRoleChanged)

    // Real change → event dispatched.
    await new OrganizationMemberService().updateRole(membership.id, org.id, 'admin')
    events.assertEmitted(OrganizationMemberRoleChanged)
  })
})
