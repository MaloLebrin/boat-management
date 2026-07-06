import { test } from '@japa/runner'
import type User from '#models/user'
import BoatPolicy from '#policies/boat_policy'
import ClientPolicy from '#policies/client_policy'
import InvoicePolicy from '#policies/invoice_policy'
import MouillagePolicy from '#policies/mouillage_policy'
import OrganizationPolicy from '#policies/organization_policy'
import PortPolicy from '#policies/port_policy'
import SubscriptionPolicy from '#policies/subscription_policy'
import OrganizationMembership from '#models/organization_membership'
import { UserFactory } from '#database/factories/user_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'

async function userWithRole(orgId: number, role: 'admin' | 'member'): Promise<User> {
  const user = await UserFactory.merge({ organizationId: orgId }).create()
  await OrganizationMembership.create({ userId: user.id, organizationId: orgId, role })
  return user
}

test.group('Policies — admin-only capability checks (integration)', () => {
  test('BoatPolicy.delete: admin allowed, member denied, cross-org denied', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const otherOrg = await OrganizationFactory.create()
    const admin = await userWithRole(org.id, 'admin')
    const member = await userWithRole(org.id, 'member')
    const outsiderAdmin = await userWithRole(otherOrg.id, 'admin')
    const boat = { organizationId: org.id } as any

    const policy = new BoatPolicy()
    assert.isTrue(await policy.delete(admin, boat))
    assert.isFalse(await policy.delete(member, boat))
    assert.isFalse(await policy.delete(outsiderAdmin, boat))
  })

  test('ClientPolicy.delete: admin allowed, member denied', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const admin = await userWithRole(org.id, 'admin')
    const member = await userWithRole(org.id, 'member')

    const policy = new ClientPolicy()
    assert.isTrue(await policy.delete(admin))
    assert.isFalse(await policy.delete(member))
  })

  test('InvoicePolicy.delete: admin allowed, member denied', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const admin = await userWithRole(org.id, 'admin')
    const member = await userWithRole(org.id, 'member')

    const policy = new InvoicePolicy()
    assert.isTrue(await policy.delete(admin))
    assert.isFalse(await policy.delete(member))
  })

  test('OrganizationPolicy.manageMembers: admin allowed, member denied', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const admin = await userWithRole(org.id, 'admin')
    const member = await userWithRole(org.id, 'member')

    const policy = new OrganizationPolicy()
    assert.isTrue(await policy.manageMembers(admin))
    assert.isFalse(await policy.manageMembers(member))
  })

  test('OrganizationPolicy.configureAI / configureBranding: admin allowed, member denied', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.create()
    const admin = await userWithRole(org.id, 'admin')
    const member = await userWithRole(org.id, 'member')

    const policy = new OrganizationPolicy()
    assert.isTrue(await policy.configureAI(admin))
    assert.isFalse(await policy.configureAI(member))
    assert.isTrue(await policy.configureBranding(admin))
    assert.isFalse(await policy.configureBranding(member))
  })

  test('SubscriptionPolicy.manage: admin allowed, member denied, cross-org denied', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.create()
    const otherOrg = await OrganizationFactory.create()
    const admin = await userWithRole(org.id, 'admin')
    const member = await userWithRole(org.id, 'member')
    const outsiderAdmin = await userWithRole(otherOrg.id, 'admin')
    const subscription = { organizationId: org.id } as any

    const policy = new SubscriptionPolicy()
    assert.isTrue(await policy.manage(admin, subscription))
    assert.isFalse(await policy.manage(member, subscription))
    assert.isFalse(await policy.manage(outsiderAdmin, subscription))
  })

  test('MouillagePolicy.create/edit stay admin-only for members (preserved behavior)', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.create()
    const admin = await userWithRole(org.id, 'admin')
    const member = await userWithRole(org.id, 'member')
    const mouillage = { port: { organizationId: org.id } } as any

    const policy = new MouillagePolicy()
    assert.isTrue(await policy.create(admin))
    assert.isFalse(await policy.create(member))
    assert.isTrue(await policy.edit(admin, mouillage))
    assert.isFalse(await policy.edit(member, mouillage))
  })

  test('MouillagePolicy.edit/delete deny an admin from another org (sameOrg via port)', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.create()
    const otherOrg = await OrganizationFactory.create()
    const outsiderAdmin = await userWithRole(otherOrg.id, 'admin')
    const mouillage = { port: { organizationId: org.id } } as any

    const policy = new MouillagePolicy()
    assert.isFalse(await policy.edit(outsiderAdmin, mouillage))
    assert.isFalse(await policy.delete(outsiderAdmin, mouillage))
  })

  test('PortPolicy.edit/delete deny an admin from another org (sameOrg)', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const otherOrg = await OrganizationFactory.create()
    const outsiderAdmin = await userWithRole(otherOrg.id, 'admin')
    const port = { organizationId: org.id } as any

    const policy = new PortPolicy()
    assert.isFalse(await policy.edit(outsiderAdmin, port))
    assert.isFalse(await policy.delete(outsiderAdmin, port))
  })

  test('PortPolicy.edit/delete allow an admin of the same org', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const admin = await userWithRole(org.id, 'admin')
    const port = { organizationId: org.id } as any

    const policy = new PortPolicy()
    assert.isTrue(await policy.edit(admin, port))
    assert.isTrue(await policy.delete(admin, port))
  })
})
