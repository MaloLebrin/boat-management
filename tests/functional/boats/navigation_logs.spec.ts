import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { NavigationLogFactory } from '#database/factories/navigation_log_factory'
import { UserFactory } from '#database/factories/user_factory'
import BoatEngine from '#models/boat_engine'
import NavigationLog from '#models/navigation_log'
import OrganizationMembership from '#models/organization_membership'
import { createAdminUser } from '#tests/functional/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

test.group('Navigation logs (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  // ─── store ───────────────────────────────────────────────────────────────

  test('POST store creates a navigation log', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client
      .post(`/boats/${boat.id}/navigation-logs`)
      .loginAs(user)
      .form({ departedAt: '2024-01-01T10:00' })

    const log = await NavigationLog.query().where('boatId', boat.id).first()
    assert.isNotNull(log)
    assert.equal(log!.status, 'in_progress')
  })

  test('POST store persists optional fields', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client.post(`/boats/${boat.id}/navigation-logs`).loginAs(user).form({
      departedAt: '2024-01-01T10:00',
      engineHoursStart: 150.5,
      windForceBeaufort: 3,
      seaState: 'slight',
      crewCount: 4,
      notes: 'Sortie test',
      departurePortName: 'Port Vieux',
    })

    const log = await NavigationLog.query().where('boatId', boat.id).firstOrFail()
    assert.equal(Number.parseFloat(log.engineHoursStart!), 150.5)
    assert.equal(log.windForceBeaufort, 3)
    assert.equal(log.seaState, 'slight')
    assert.equal(log.crewCount, 4)
    assert.equal(log.notes, 'Sortie test')
    assert.equal(log.departurePortName, 'Port Vieux')
  })

  test('POST store requires authentication', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/navigation-logs`)
      .form({ departedAt: '2024-01-01T10:00' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')

    const count = await NavigationLog.query().where('boatId', boat.id).count('* as total')
    assert.equal(Number(count[0].$extras.total), 0)
  })

  test('POST store rejects user from another organization', async ({ client, assert }) => {
    const boatOwner = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: boatOwner.organizationId! }).create()
    const outsider = await createAdminUser()

    await client
      .post(`/boats/${boat.id}/navigation-logs`)
      .loginAs(outsider)
      .form({ departedAt: '2024-01-01T10:00' })

    const count = await NavigationLog.query().where('boatId', boat.id).count('* as total')
    assert.equal(Number(count[0].$extras.total), 0)
  })

  // ─── close ───────────────────────────────────────────────────────────────

  test('PATCH close completes an in-progress trip', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      departedAt: DateTime.fromISO('2024-01-01T08:00:00'),
    }).create()

    await client
      .patch(`/boats/${boat.id}/navigation-logs/${log.id}/close`)
      .loginAs(user)
      .form({ arrivedAt: '2024-01-01T14:00' })

    const updated = await NavigationLog.findOrFail(log.id)
    assert.equal(updated.status, 'completed')
    assert.isNotNull(updated.arrivedAt)
  })

  test('PATCH close persists all optional close fields', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      departedAt: DateTime.fromISO('2024-01-01T08:00:00'),
    }).create()

    await client.patch(`/boats/${boat.id}/navigation-logs/${log.id}/close`).loginAs(user).form({
      arrivedAt: '2024-01-01T14:00',
      distanceNm: 42.5,
      engineHoursEnd: 210.5,
      fuelConsumedLiters: 18.3,
      windForceBeaufort: 4,
      seaState: 'moderate',
      crewCount: 3,
      arrivalPortName: 'Port Nouveau',
    })

    const updated = await NavigationLog.findOrFail(log.id)
    assert.equal(Number.parseFloat(updated.distanceNm!), 42.5)
    assert.equal(Number.parseFloat(updated.engineHoursEnd!), 210.5)
    assert.equal(Number.parseFloat(updated.fuelConsumedLiters!), 18.3)
    assert.equal(updated.windForceBeaufort, 4)
    assert.equal(updated.seaState, 'moderate')
    assert.equal(updated.crewCount, 3)
    assert.equal(updated.arrivalPortName, 'Port Nouveau')
  })

  test('PATCH close updates boat engine hours when engineHoursEnd is higher', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await BoatEngineFactory.merge({ boatId: boat.id, hours: 100 }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      departedAt: DateTime.fromISO('2024-01-01T08:00:00'),
    }).create()

    await client
      .patch(`/boats/${boat.id}/navigation-logs/${log.id}/close`)
      .loginAs(user)
      .form({ arrivedAt: '2024-01-01T14:00', engineHoursEnd: 300 })

    const engine = await BoatEngine.query().where('boatId', boat.id).firstOrFail()
    assert.equal(engine.hours, 300)
  })

  test('PATCH close does not update engine hours when engineHoursEnd is lower', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await BoatEngineFactory.merge({ boatId: boat.id, hours: 500 }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      departedAt: DateTime.fromISO('2024-01-01T08:00:00'),
    }).create()

    await client
      .patch(`/boats/${boat.id}/navigation-logs/${log.id}/close`)
      .loginAs(user)
      .form({ arrivedAt: '2024-01-01T14:00', engineHoursEnd: 200 })

    const engine = await BoatEngine.query().where('boatId', boat.id).firstOrFail()
    assert.equal(engine.hours, 500)
  })

  test('PATCH close rejects arrivedAt before departedAt', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      departedAt: DateTime.fromISO('2024-01-01T10:00:00'),
    }).create()

    const response = await client
      .patch(`/boats/${boat.id}/navigation-logs/${log.id}/close`)
      .loginAs(user)
      .form({ arrivedAt: '2024-01-01T08:00' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}?tab=navigation-logs`)

    const unchanged = await NavigationLog.findOrFail(log.id)
    assert.equal(unchanged.status, 'in_progress')
  })

  test('PATCH close rejects engineHoursEnd less than engineHoursStart', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      departedAt: DateTime.fromISO('2024-01-01T08:00:00'),
      engineHoursStart: '200',
    }).create()

    const response = await client
      .patch(`/boats/${boat.id}/navigation-logs/${log.id}/close`)
      .loginAs(user)
      .form({ arrivedAt: '2024-01-01T14:00', engineHoursEnd: 100 })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}?tab=navigation-logs`)

    const unchanged = await NavigationLog.findOrFail(log.id)
    assert.equal(unchanged.status, 'in_progress')
  })

  // ─── update ──────────────────────────────────────────────────────────────

  test('PATCH update persists fields on the log', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
    }).create()

    await client
      .patch(`/boats/${boat.id}/navigation-logs/${log.id}`)
      .loginAs(user)
      .form({ windForceBeaufort: 4, seaState: 'moderate', crewCount: 2, notes: 'Test update' })

    const updated = await NavigationLog.findOrFail(log.id)
    assert.equal(updated.windForceBeaufort, 4)
    assert.equal(updated.seaState, 'moderate')
    assert.equal(updated.crewCount, 2)
    assert.equal(updated.notes, 'Test update')
  })

  test('PATCH update with matching _expectedUpdatedAt succeeds', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      windForceBeaufort: 1,
    }).create()

    const response = await client
      .patch(`/boats/${boat.id}/navigation-logs/${log.id}`)
      .loginAs(user)
      .form({ windForceBeaufort: 3, _expectedUpdatedAt: log.updatedAt?.toISO() })
      .redirects(0)

    response.assertStatus(302)
    const updated = await NavigationLog.findOrFail(log.id)
    assert.equal(updated.windForceBeaufort, 3)
  })

  test('PATCH update with stale _expectedUpdatedAt redirects back without updating', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      windForceBeaufort: 1,
    }).create()

    const response = await client
      .patch(`/boats/${boat.id}/navigation-logs/${log.id}`)
      .loginAs(user)
      .form({ windForceBeaufort: 7, _expectedUpdatedAt: '2000-01-01T00:00:00.000+00:00' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('conflictType', 'update-navigation-log')
    response.assertFlashMessage('conflictData')
    const unchanged = await NavigationLog.findOrFail(log.id)
    assert.equal(unchanged.windForceBeaufort, 1)
  })

  test('PATCH close with matching _expectedUpdatedAt succeeds', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      departedAt: DateTime.fromISO('2024-01-01T08:00:00'),
    }).create()

    const response = await client
      .patch(`/boats/${boat.id}/navigation-logs/${log.id}/close`)
      .loginAs(user)
      .form({ arrivedAt: '2024-01-01T14:00', _expectedUpdatedAt: log.updatedAt?.toISO() })
      .redirects(0)

    response.assertStatus(302)
    const updated = await NavigationLog.findOrFail(log.id)
    assert.equal(updated.status, 'completed')
  })

  test('PATCH close with stale _expectedUpdatedAt redirects back without closing', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      departedAt: DateTime.fromISO('2024-01-01T08:00:00'),
    }).create()

    const response = await client
      .patch(`/boats/${boat.id}/navigation-logs/${log.id}/close`)
      .loginAs(user)
      .form({ arrivedAt: '2024-01-01T14:00', _expectedUpdatedAt: '2000-01-01T00:00:00.000+00:00' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('conflictType', 'close-navigation-log')
    response.assertFlashMessage('conflictData')
    const unchanged = await NavigationLog.findOrFail(log.id)
    assert.equal(unchanged.status, 'in_progress')
  })

  // ─── destroy ─────────────────────────────────────────────────────────────

  test('DELETE destroy deletes a log as admin', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
    }).create()

    await client.delete(`/boats/${boat.id}/navigation-logs/${log.id}`).loginAs(user)

    const found = await NavigationLog.find(log.id)
    assert.isNull(found)
  })

  test('DELETE destroy is rejected for non-admin member', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: admin.organizationId!,
    }).create()

    const member = await UserFactory.merge({ organizationId: admin.organizationId! }).create()
    await OrganizationMembership.create({
      userId: member.id,
      organizationId: admin.organizationId!,
      role: 'member',
    })

    await client.delete(`/boats/${boat.id}/navigation-logs/${log.id}`).loginAs(member).redirects(0)

    const found = await NavigationLog.find(log.id)
    assert.isNotNull(found)
  })
})
