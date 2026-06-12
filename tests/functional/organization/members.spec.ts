import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import OrganizationMembership from '#models/organization_membership'
import { UserFactory } from '#database/factories/user_factory'
import { OrganizationMembershipFactory } from '#database/factories/organization_membership_factory'
import { createAdminUser } from '#tests/functional/helpers'

test.group('Organization members (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /organization/members returns 200 for admin user', async ({ client }) => {
    const user = await createAdminUser()

    const response = await client.get('/organization/members').loginAs(user)

    response.assertStatus(200)
  })

  test('GET /organization/members returns 200 for regular member', async ({ client }) => {
    const user = await UserFactory.with('organization').create()

    const response = await client.get('/organization/members').loginAs(user)

    response.assertStatus(200)
  })

  test('GET /organization/members redirects to /login when unauthenticated', async ({ client }) => {
    const response = await client.get('/organization/members').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('POST /organization/members adds existing user and redirects back', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const newMember = await UserFactory.create()

    const response = await client
      .post('/organization/members')
      .loginAs(admin)
      .form({ email: newMember.email, role: 'member' })

    const membership = await OrganizationMembership.query()
      .where('userId', newMember.id)
      .where('organizationId', admin.organizationId!)
      .first()
    assert.isNotNull(membership)
    response.assertStatus(302)
  })

  test('POST /organization/members redirects back when user not found', async ({ client }) => {
    const admin = await createAdminUser()

    const response = await client
      .post('/organization/members')
      .loginAs(admin)
      .form({ email: 'nobody@example.com', role: 'member' })
      .redirects(0)

    response.assertStatus(302)
  })

  test('POST /organization/members is forbidden for non-admin', async ({ client }) => {
    const user = await UserFactory.with('organization').create()
    const newMember = await UserFactory.create()

    const response = await client
      .post('/organization/members')
      .loginAs(user)
      .form({ email: newMember.email, role: 'member' })
      .redirects(0)

    response.assertStatus(403)
  })

  test('PUT /organization/members/:id updates role and redirects back', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const membership = await OrganizationMembershipFactory.merge({
      organizationId: admin.organizationId!,
      role: 'member',
    })
      .with('user')
      .create()

    const response = await client
      .put(`/organization/members/${membership.id}`)
      .loginAs(admin)
      .form({ role: 'admin' })

    response.assertStatus(302)

    await membership.refresh()
    assert.equal(membership.role, 'admin')
  })

  test('DELETE /organization/members/:id removes member and redirects back', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const membership = await OrganizationMembershipFactory.merge({
      organizationId: admin.organizationId!,
      role: 'member',
    })
      .with('user')
      .create()

    const response = await client.delete(`/organization/members/${membership.id}`).loginAs(admin)

    response.assertStatus(302)

    const found = await OrganizationMembership.find(membership.id)
    assert.isNull(found)
  })

  test('DELETE /organization/members/:id is forbidden for non-admin', async ({ client }) => {
    const user = await UserFactory.with('organization').create()
    const membership = await OrganizationMembershipFactory.merge({
      organizationId: user.organizationId!,
      role: 'member',
    })
      .with('user')
      .create()

    const response = await client
      .delete(`/organization/members/${membership.id}`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(403)
  })
})
