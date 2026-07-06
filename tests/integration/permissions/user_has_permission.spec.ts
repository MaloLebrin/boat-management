import { test } from '@japa/runner'
import OrganizationMembership from '#models/organization_membership'
import { UserFactory } from '#database/factories/user_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'

test.group('User#hasPermission (integration)', () => {
  test('admin has an admin-only capability', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()
    await OrganizationMembership.create({ userId: user.id, organizationId: org.id, role: 'admin' })

    assert.isTrue(await user.hasPermission(org.id, 'boats.delete'))
  })

  test('member does not have an admin-only capability', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()
    await OrganizationMembership.create({
      userId: user.id,
      organizationId: org.id,
      role: 'member',
    })

    assert.isFalse(await user.hasPermission(org.id, 'boats.delete'))
  })

  test('member has a shared capability', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()
    await OrganizationMembership.create({
      userId: user.id,
      organizationId: org.id,
      role: 'member',
    })

    assert.isTrue(await user.hasPermission(org.id, 'boats.view'))
  })

  test('user without a membership row has no permission', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const user = await UserFactory.create()

    assert.isFalse(await user.hasPermission(org.id, 'boats.view'))
  })

  test('legacy org-linked user without a membership row defaults to member capabilities', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()

    assert.isTrue(await user.hasPermission(org.id, 'boats.view'))
    assert.isFalse(await user.hasPermission(org.id, 'boats.delete'))
  })

  test('legacy org-linked user has no permission for a different org', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const otherOrg = await OrganizationFactory.create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()

    assert.isFalse(await user.hasPermission(otherOrg.id, 'boats.view'))
  })

  test('changing the membership role flips the result', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()
    const membership = await OrganizationMembership.create({
      userId: user.id,
      organizationId: org.id,
      role: 'member',
    })

    assert.isFalse(await user.hasPermission(org.id, 'boats.delete'))

    membership.role = 'admin'
    await membership.save()

    assert.isTrue(await user.hasPermission(org.id, 'boats.delete'))
  })
})
