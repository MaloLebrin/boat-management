import { BoatFactory } from '#database/factories/boat_factory'
import { NavigationLogFactory } from '#database/factories/navigation_log_factory'
import { UserFactory } from '#database/factories/user_factory'
import CrewMember from '#models/crew_member'
import NavigationLog from '#models/navigation_log'
import CrewService from '#services/crew_service'
import { createAdminUser } from '#tests/functional/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

test.group('Navigation log crew sync (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('PATCH crew sync assigns valid crew members', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
    }).create()
    const member = await CrewMember.create({
      organizationId: user.organizationId!,
      firstName: 'Alice',
      lastName: 'Dupont',
    })

    await client.patch(`/boats/${boat.id}/navigation-logs/${log.id}/crew`).loginAs(user).form({
      'crew[0][crewMemberId]': member.id,
      'crew[0][role]': 'skipper',
    })

    const refreshedLog = await NavigationLog.query()
      .where('id', log.id)
      .preload('crew')
      .firstOrFail()

    assert.lengthOf(refreshedLog.crew, 1)
    assert.equal(refreshedLog.crew[0].id, member.id)
  })

  test('PATCH crew sync ignores IDs from another organization (IDOR #157)', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
    }).create()

    const otherUser = await UserFactory.with('organization').create()
    const foreignMember = await CrewMember.create({
      organizationId: otherUser.organizationId!,
      firstName: 'Bob',
      lastName: 'Evil',
    })

    await client.patch(`/boats/${boat.id}/navigation-logs/${log.id}/crew`).loginAs(user).form({
      'crew[0][crewMemberId]': foreignMember.id,
      'crew[0][role]': 'crew',
    })

    const refreshedLog = await NavigationLog.query()
      .where('id', log.id)
      .preload('crew')
      .firstOrFail()

    assert.lengthOf(refreshedLog.crew, 0, 'cross-org member must not be synced')
  })

  test('PATCH crew sync keeps valid IDs and drops foreign IDs', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
    }).create()

    const validMember = await CrewMember.create({
      organizationId: user.organizationId!,
      firstName: 'Alice',
      lastName: 'Good',
    })
    const otherUser = await UserFactory.with('organization').create()
    const foreignMember = await CrewMember.create({
      organizationId: otherUser.organizationId!,
      firstName: 'Bob',
      lastName: 'Bad',
    })

    await client.patch(`/boats/${boat.id}/navigation-logs/${log.id}/crew`).loginAs(user).form({
      'crew[0][crewMemberId]': validMember.id,
      'crew[0][role]': 'skipper',
      'crew[1][crewMemberId]': foreignMember.id,
      'crew[1][role]': 'crew',
    })

    const refreshedLog = await NavigationLog.query()
      .where('id', log.id)
      .preload('crew')
      .firstOrFail()

    assert.lengthOf(refreshedLog.crew, 1)
    assert.equal(refreshedLog.crew[0].id, validMember.id)
  })

  test('syncCrewForNavigationLog with an empty list clears the trip crew (intended)', async ({
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
    }).create()
    const member = await CrewMember.create({
      organizationId: user.organizationId!,
      firstName: 'Alice',
      lastName: 'Dupont',
    })

    const service = new CrewService()
    await service.syncCrewForNavigationLog(log, {
      crew: [{ crewMemberId: member.id, role: 'skipper' }],
    })

    // Explicitly clearing (removing the last member) is allowed.
    await service.syncCrewForNavigationLog(log, { crew: [] })

    const refreshed = await NavigationLog.query().where('id', log.id).preload('crew').firstOrFail()
    assert.lengthOf(refreshed.crew, 0)
  })

  test('PATCH crew sync without a crew field is rejected and keeps existing crew', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
    }).create()
    const member = await CrewMember.create({
      organizationId: user.organizationId!,
      firstName: 'Alice',
      lastName: 'Dupont',
    })
    await new CrewService().syncCrewForNavigationLog(log, {
      crew: [{ crewMemberId: member.id, role: 'skipper' }],
    })

    // A malformed request that omits `crew` entirely must not silently wipe the
    // crew — the field is required, so validation rejects it.
    const response = await client
      .patch(`/boats/${boat.id}/navigation-logs/${log.id}/crew`)
      .loginAs(user)
      .form({})
      .redirects(0)

    response.assertStatus(302)

    const refreshed = await NavigationLog.query().where('id', log.id).preload('crew').firstOrFail()
    assert.lengthOf(refreshed.crew, 1, 'existing crew must be preserved when crew field is missing')
  })

  test('PATCH crew sync redirects unauthenticated user', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
    }).create()

    const response = await client
      .patch(`/boats/${boat.id}/navigation-logs/${log.id}/crew`)
      .form({ 'crew[0][crewMemberId]': 1, 'crew[0][role]': 'skipper' })

    response.assertRedirectsTo('/login')
  })
})
