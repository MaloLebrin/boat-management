import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { createHash } from 'node:crypto'
import OrganizationInvitation from '#models/organization_invitation'
import OrganizationMembership from '#models/organization_membership'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
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

  test('POST /invitations/accept updates user.organizationId to the new org', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const plainToken = 'valid-plain-token-rescope-001'

    await OrganizationInvitationFactory.merge({
      email: 'rescoped@example.com',
      organizationId: admin.organizationId!,
      token: sha256(plainToken),
      status: 'pending',
      expiresAt: DateTime.now().plus({ days: 7 }),
    }).create()

    const invitedUser = await UserFactory.with('organization', 1)
      .merge({ email: 'rescoped@example.com' })
      .create()

    const originalOrgId = invitedUser.organizationId

    const response = await client
      .post('/invitations/accept')
      .loginAs(invitedUser)
      .form({ token: plainToken })
      .redirects(0)

    response.assertStatus(302)

    await invitedUser.refresh()

    assert.equal(invitedUser.organizationId, admin.organizationId)
    assert.notEqual(invitedUser.organizationId, originalOrgId)
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

test.group('Organization invitations — decline (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST /invitations/decline cancels the invitation', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const plainToken = 'decline-plain-token-aaa'

    await OrganizationInvitationFactory.merge({
      email: 'alice@example.com',
      organizationId: admin.organizationId!,
      token: sha256(plainToken),
      status: 'pending',
      expiresAt: DateTime.now().plus({ days: 7 }),
    }).create()

    const response = await client
      .post('/invitations/decline')
      .form({ token: plainToken })
      .redirects(0)

    response.assertStatus(302)

    const invitation = await OrganizationInvitation.query()
      .where('token', sha256(plainToken))
      .firstOrFail()

    assert.equal(invitation.status, 'cancelled')
  })

  test('POST /invitations/decline does not require authentication', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const plainToken = 'decline-plain-token-bbb'

    await OrganizationInvitationFactory.merge({
      email: 'alice@example.com',
      organizationId: admin.organizationId!,
      token: sha256(plainToken),
      status: 'pending',
      expiresAt: DateTime.now().plus({ days: 7 }),
    }).create()

    const response = await client
      .post('/invitations/decline')
      .form({ token: plainToken })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/')

    const invitation = await OrganizationInvitation.query()
      .where('token', sha256(plainToken))
      .firstOrFail()

    assert.equal(invitation.status, 'cancelled')
  })

  test('POST /invitations/decline redirects back on invalid token', async ({ client }) => {
    const response = await client
      .post('/invitations/decline')
      .form({ token: 'invalid-token' })
      .redirects(0)

    response.assertStatus(302)
  })
})

test.group('Organization invitations — re-invite (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST /organization/invitations replaces existing pending invitation', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const firstToken = 'first-plain-token-ccc'

    const firstInvitation = await OrganizationInvitationFactory.merge({
      email: 'alice@example.com',
      organizationId: admin.organizationId!,
      token: sha256(firstToken),
      status: 'pending',
      expiresAt: DateTime.now().plus({ days: 7 }),
    }).create()

    const response = await client
      .post('/organization/invitations')
      .loginAs(admin)
      .form({ email: 'alice@example.com', role: 'member' })
      .redirects(0)

    response.assertStatus(302)

    await firstInvitation.refresh()
    assert.equal(firstInvitation.status, 'cancelled')

    const newInvitation = await OrganizationInvitation.query()
      .where('organizationId', admin.organizationId!)
      .where('email', 'alice@example.com')
      .where('status', 'pending')
      .first()

    assert.isNotNull(newInvitation)
    assert.notEqual(newInvitation!.id, firstInvitation.id)
  })

  test('POST /organization/invitations rejects a user already attached to the org without a membership row', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()

    // A user belonging to the org via `organizationId` but WITHOUT a membership
    // row (the org owner / A-03 drift scenario) must not be invitable.
    const orgUser = await UserFactory.merge({
      email: 'owner-no-membership@example.com',
      organizationId: admin.organizationId!,
    }).create()

    const membershipBefore = await OrganizationMembership.query()
      .where('userId', orgUser.id)
      .where('organizationId', admin.organizationId!)
      .first()
    assert.isNull(membershipBefore)

    const response = await client
      .post('/organization/invitations')
      .loginAs(admin)
      .form({ email: 'owner-no-membership@example.com', role: 'member' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'You are already a member of this organisation.')

    const invitation = await OrganizationInvitation.query()
      .where('organizationId', admin.organizationId!)
      .where('email', 'owner-no-membership@example.com')
      .first()
    assert.isNull(invitation)
  })
})

test.group('Organization invitations — boat_owner role (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST /organization/invitations rejects a boat_owner invitation without boatIds', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()

    const response = await client
      .post('/organization/invitations')
      .loginAs(admin)
      .form({ email: 'owner@example.com', role: 'boat_owner' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Select at least one boat for a boat owner invitation.')

    const invitation = await OrganizationInvitation.query()
      .where('organizationId', admin.organizationId!)
      .where('email', 'owner@example.com')
      .first()
    assert.isNull(invitation)
  })

  test('POST /organization/invitations rejects boatIds belonging to another organization', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const otherAdmin = await createAdminUser()
    const foreignBoat = await BoatFactory.merge({
      organizationId: otherAdmin.organizationId!,
    }).create()

    const response = await client
      .post('/organization/invitations')
      .loginAs(admin)
      .form({
        'email': 'owner@example.com',
        'role': 'boat_owner',
        'boatIds[0]': foreignBoat.id,
      })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'One or more selected boats do not belong to this organization.'
    )

    const invitation = await OrganizationInvitation.query()
      .where('organizationId', admin.organizationId!)
      .where('email', 'owner@example.com')
      .first()
    assert.isNull(invitation)
  })

  test('accepting a boat_owner invitation with boatIds attaches the boats via boat_owners', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()

    const createResponse = await client
      .post('/organization/invitations')
      .loginAs(admin)
      .form({
        'email': 'newowner@example.com',
        'role': 'boat_owner',
        'boatIds[0]': boat.id,
      })
      .redirects(0)
    createResponse.assertStatus(302)

    const invitation = await OrganizationInvitation.query()
      .where('organizationId', admin.organizationId!)
      .where('email', 'newowner@example.com')
      .where('status', 'pending')
      .firstOrFail()
    assert.equal(invitation.role, 'boat_owner')
    assert.deepEqual(invitation.boatIds, [boat.id])

    // Simulate acceptance directly against the service since the invite email
    // link carries the plain token, which is never persisted (only its hash) —
    // recreate a fresh invitation with a known plain token to accept it.
    const plainToken = 'boat-owner-plain-token-001'
    await OrganizationInvitation.query()
      .where('id', invitation.id)
      .update({
        token: createHash('sha256').update(plainToken).digest('hex'),
      })

    const invitedUser = await UserFactory.merge({ email: 'newowner@example.com' }).create()

    const acceptResponse = await client
      .post('/invitations/accept')
      .loginAs(invitedUser)
      .form({ token: plainToken })
      .redirects(0)
    acceptResponse.assertStatus(302)

    const membership = await OrganizationMembership.query()
      .where('userId', invitedUser.id)
      .where('organizationId', admin.organizationId!)
      .firstOrFail()
    assert.equal(membership.role, 'boat_owner')

    await boat.load('owners')
    assert.equal(boat.owners.length, 1)
    assert.equal(boat.owners[0].id, invitedUser.id)
  })
})
