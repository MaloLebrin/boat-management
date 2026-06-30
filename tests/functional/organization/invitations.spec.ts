import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { createHash } from 'node:crypto'
import OrganizationInvitation from '#models/organization_invitation'
import OrganizationMembership from '#models/organization_membership'
import { UserFactory } from '#database/factories/user_factory'
import { OrganizationInvitationFactory } from '#database/factories/organization_invitation_factory'
import { createAdminUser } from '#tests/functional/helpers'
import { DateTime } from 'luxon'

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

test.group('Organization invitations — accept (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST /invitations/accept creates membership for correct user', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const plainToken = 'valid-plain-token-abc123'

    await OrganizationInvitationFactory.merge({
      email: 'invited@example.com',
      organizationId: admin.organizationId!,
      token: sha256(plainToken),
      status: 'pending',
      expiresAt: DateTime.now().plus({ days: 7 }),
    }).create()

    const invitedUser = await UserFactory.merge({ email: 'invited@example.com' }).create()

    const response = await client
      .post('/invitations/accept')
      .loginAs(invitedUser)
      .form({ token: plainToken })
      .redirects(0)

    response.assertStatus(302)

    const membership = await OrganizationMembership.query()
      .where('userId', invitedUser.id)
      .where('organizationId', admin.organizationId!)
      .first()

    assert.isNotNull(membership)
  })

  test('POST /invitations/accept rejects when user email does not match invitation', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const plainToken = 'valid-plain-token-def456'

    await OrganizationInvitationFactory.merge({
      email: 'alice@example.com',
      organizationId: admin.organizationId!,
      token: sha256(plainToken),
      status: 'pending',
      expiresAt: DateTime.now().plus({ days: 7 }),
    }).create()

    const bob = await UserFactory.merge({ email: 'bob@example.com' }).create()

    const response = await client
      .post('/invitations/accept')
      .loginAs(bob)
      .form({ token: plainToken })
      .redirects(0)

    response.assertStatus(302)

    const membership = await OrganizationMembership.query()
      .where('userId', bob.id)
      .where('organizationId', admin.organizationId!)
      .first()

    assert.isNull(membership)

    const invitation = await OrganizationInvitation.query()
      .where('token', sha256(plainToken))
      .firstOrFail()

    assert.equal(invitation.status, 'pending')
  })

  test('POST /invitations/accept is case-insensitive on email comparison', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const plainToken = 'valid-plain-token-ghi789'

    await OrganizationInvitationFactory.merge({
      email: 'Alice@Example.com',
      organizationId: admin.organizationId!,
      token: sha256(plainToken),
      status: 'pending',
      expiresAt: DateTime.now().plus({ days: 7 }),
    }).create()

    const alice = await UserFactory.merge({ email: 'alice@example.com' }).create()

    const response = await client
      .post('/invitations/accept')
      .loginAs(alice)
      .form({ token: plainToken })
      .redirects(0)

    response.assertStatus(302)

    const membership = await OrganizationMembership.query()
      .where('userId', alice.id)
      .where('organizationId', admin.organizationId!)
      .first()

    assert.isNotNull(membership)
  })

  test('POST /invitations/accept redirects to login when unauthenticated', async ({ client }) => {
    const response = await client
      .post('/invitations/accept')
      .form({ token: 'any-token' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})
