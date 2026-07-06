import { test } from '@japa/runner'
import PermissionService from '#services/permission_service'
import OrganizationMembership from '#models/organization_membership'
import { UserFactory } from '#database/factories/user_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'

test.group('PermissionService.sharedProps parity with User#hasPermission (integration)', () => {
  test('legacy org-linked user without a membership row: sharedProps matches hasPermission', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()
    const service = new PermissionService()

    const props = await service.sharedProps(user)

    assert.equal(props.role, 'member')
    assert.include(props.capabilities, 'boats.view')
    assert.notInclude(props.capabilities, 'boats.delete')
    assert.equal(
      props.capabilities.includes('boats.view'),
      await user.hasPermission(org.id, 'boats.view')
    )
    assert.equal(
      props.capabilities.includes('boats.delete'),
      await user.hasPermission(org.id, 'boats.delete')
    )
  })

  test('member with an explicit membership row: sharedProps matches hasPermission', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()
    await OrganizationMembership.create({ userId: user.id, organizationId: org.id, role: 'member' })
    const service = new PermissionService()

    const props = await service.sharedProps(user)

    assert.equal(props.role, 'member')
    assert.notInclude(props.capabilities, 'boats.delete')
  })

  test('admin: sharedProps includes admin-only capabilities', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()
    await OrganizationMembership.create({ userId: user.id, organizationId: org.id, role: 'admin' })
    const service = new PermissionService()

    const props = await service.sharedProps(user)

    assert.equal(props.role, 'admin')
    assert.include(props.capabilities, 'boats.delete')
  })

  test('user without an organization: role null, no capabilities', async ({ assert }) => {
    const user = await UserFactory.create()
    const service = new PermissionService()

    const props = await service.sharedProps(user)

    assert.isNull(props.role)
    assert.lengthOf(props.capabilities, 0)
  })
})
