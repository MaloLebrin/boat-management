import { test } from '@japa/runner'
import User from '#models/user'
import OrganizationMembership from '#models/organization_membership'
import { UserFactory } from '#database/factories/user_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { countQueries } from '#tests/utils/query_counter'

const MEMBERSHIPS = 'organization_memberships'

async function adminIn(orgId: number) {
  const user = await UserFactory.merge({ organizationId: orgId }).create()
  await OrganizationMembership.create({ userId: user.id, organizationId: orgId, role: 'admin' })
  return user
}

test.group('User role cache (integration)', () => {
  test('a first lookup hits organization_memberships once', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const user = await adminIn(org.id)

    const queries = await countQueries(() => user.getRoleInOrg(org.id), { table: MEMBERSHIPS })

    assert.equal(queries, 1)
  })

  test('repeated permission checks on the same instance do not hit the database again', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.create()
    const user = await adminIn(org.id)

    const queries = await countQueries(
      async () => {
        await user.hasPermission(org.id, 'boats.view')
        await user.hasPermission(org.id, 'boats.delete')
        await user.isAdminOf(org.id)
        await user.getEffectiveRoleInOrg(org.id)
      },
      { table: MEMBERSHIPS }
    )

    assert.equal(queries, 1)
  })

  test('a missing membership is cached too', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()

    const queries = await countQueries(
      async () => {
        assert.isNull(await user.getRoleInOrg(org.id))
        assert.equal(await user.getEffectiveRoleInOrg(org.id), 'member')
        assert.isFalse(await user.hasPermission(org.id, 'boats.delete'))
      },
      { table: MEMBERSHIPS }
    )

    assert.equal(queries, 1)
  })

  test('each organization has its own cache entry', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const otherOrg = await OrganizationFactory.create()
    const user = await adminIn(org.id)
    await OrganizationMembership.create({
      userId: user.id,
      organizationId: otherOrg.id,
      role: 'member',
    })

    const queries = await countQueries(
      async () => {
        assert.equal(await user.getRoleInOrg(org.id), 'admin')
        assert.equal(await user.getRoleInOrg(otherOrg.id), 'member')
        assert.equal(await user.getRoleInOrg(org.id), 'admin')
      },
      { table: MEMBERSHIPS }
    )

    assert.equal(queries, 2)
  })

  test('two instances of the same user do not share a cache', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const user = await adminIn(org.id)
    const again = await User.findOrFail(user.id)
    await user.getRoleInOrg(org.id)

    const queries = await countQueries(() => again.getRoleInOrg(org.id), { table: MEMBERSHIPS })

    assert.equal(queries, 1)
  })

  test('saving a membership invalidates the cache', async ({ assert }) => {
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

  test('deleting a membership invalidates the cache', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()
    const membership = await OrganizationMembership.create({
      userId: user.id,
      organizationId: org.id,
      role: 'admin',
    })
    assert.equal(await user.getRoleInOrg(org.id), 'admin')

    await membership.delete()

    assert.isNull(await user.getRoleInOrg(org.id))
    assert.equal(await user.getEffectiveRoleInOrg(org.id), 'member')
  })

  test('creating a membership for a user without one invalidates the cache', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()
    assert.isNull(await user.getRoleInOrg(org.id))

    await OrganizationMembership.create({ userId: user.id, organizationId: org.id, role: 'admin' })

    assert.equal(await user.getRoleInOrg(org.id), 'admin')
  })

  test('forgetRoles() drops the cache explicitly', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const user = await adminIn(org.id)
    await user.getRoleInOrg(org.id)

    user.forgetRoles()
    const queries = await countQueries(() => user.getRoleInOrg(org.id), { table: MEMBERSHIPS })

    assert.equal(queries, 1)
  })
})
