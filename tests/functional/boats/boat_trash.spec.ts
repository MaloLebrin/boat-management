import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import { truncateDb } from '#tests/utils/db'
import Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'
import { withTrashed } from '#models/mixins/soft_deletes'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatMaintenanceTaskFactory } from '#database/factories/boat_maintenance_task_factory'
import BoatTrashService from '#services/boat_trash_service'
import DashboardService from '#services/dashboard_service'
import { createAdminUser, createMemberUser } from '#tests/functional/helpers'

test.group('Boat trash (#858)', (group) => {
  group.each.setup(() => truncateDb())

  test('DELETE hides the boat everywhere but keeps its engine', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      name: 'Hermione',
    }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    await BoatMaintenanceTaskFactory.apply('overdue')
      .merge({ boatId: boat.id, organizationId: user.organizationId!, title: 'Vidange cachée' })
      .create()

    const response = await client.delete(`/boats/${boat.id}`).loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')
    response.assertFlashMessage('successAction', `/boats/${boat.id}/restore`)

    assert.isNull(await Boat.find(boat.id))
    assert.isNotNull(await BoatEngine.find(engine.id))

    const list = await client.get('/boats').loginAs(user).withInertia()
    const names = (
      list.inertiaProps as { boats: { data: { name: string }[]; meta: { total: number } } }
    ).boats
    assert.equal(names.meta.total, 0)
    assert.deepEqual(names.data, [])

    const show = await client.get(`/boats/${boat.id}`).loginAs(user).redirects(0)
    show.assertHeader('location', '/boats')

    const dashboard = await app.container.make(DashboardService)
    const data = await dashboard.getForUser(user)
    assert.notInclude(
      data.boats.map((row) => row.id),
      boat.id
    )
    assert.notInclude(
      data.urgentMaintenance.map((row) => row.title),
      'Vidange cachée'
    )

    const sql = Boat.query().where('organizationId', user.organizationId!).toQuery()
    assert.include(sql, 'deleted_at')
    const withAll = withTrashed(
      Boat.query().where('organizationId', user.organizationId!)
    ).toQuery()
    assert.notInclude(withAll.toLowerCase(), 'is null')
  })

  test('POST restore brings the boat back, including from the undo flash target', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await client.delete(`/boats/${boat.id}`).loginAs(user)

    const response = await client.post(`/boats/${boat.id}/restore`).loginAs(user).redirects(0)

    response.assertHeader('location', `/boats/${boat.id}`)
    assert.isNotNull(await Boat.find(boat.id))
    const restored = await Boat.find(boat.id)
    assert.isNull(restored!.deletedAt)
  })

  test('the trash list is admin-only and offers the trashed boat', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const kept = await BoatFactory.merge({
      organizationId: admin.organizationId!,
      name: 'Still here',
    }).create()
    const gone = await BoatFactory.merge({
      organizationId: admin.organizationId!,
      name: 'In the trash',
    }).create()
    await client.delete(`/boats/${gone.id}`).loginAs(admin)

    const asAdmin = await client.get('/boats?trashed=1').loginAs(admin).withInertia()
    const adminProps = asAdmin.inertiaProps as {
      filters: { trashed: boolean }
      boats: { meta: { total: number }; data: { name: string; purgeAt: string | null }[] }
    }
    assert.isTrue(adminProps.filters.trashed)
    assert.equal(adminProps.boats.meta.total, 1)
    assert.deepEqual(
      adminProps.boats.data.map((row) => row.name),
      ['In the trash']
    )
    assert.isString(adminProps.boats.data[0]!.purgeAt)

    const asMember = await client.get('/boats?trashed=1').loginAs(member).withInertia()
    const memberProps = asMember.inertiaProps as {
      filters: { trashed: boolean }
      boats: { data: { name: string }[] }
    }
    assert.isFalse(memberProps.filters.trashed)
    assert.deepEqual(
      memberProps.boats.data.map((row) => row.name),
      [kept.name]
    )

    const denied = await client.post(`/boats/${gone.id}/restore`).loginAs(member).redirects(0)
    denied.assertStatus(302)
    assert.isNull(await Boat.find(gone.id))
  })

  test('a trashed boat frees its quota but keeps its name until purge', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser('starter')
    await BoatFactory.merge({ organizationId: user.organizationId!, name: 'One' }).create()
    const second = await BoatFactory.merge({
      organizationId: user.organizationId!,
      name: 'Two',
      registrationNumber: 'FR-HELD',
    }).create()

    await client.delete(`/boats/${second.id}`).loginAs(user)

    const list = await client.get('/boats').loginAs(user).withInertia()
    const props = list.inertiaProps as {
      canAddBoat: boolean
      boatQuota: { used: number; limit: number }
    }
    assert.isTrue(props.canAddBoat)
    assert.deepEqual(props.boatQuota, { used: 1, limit: 2 })

    const blockedName = await client
      .post('/boats')
      .loginAs(user)
      .form({ name: 'Two', propulsionType: 'motorboat' })
      .redirects(0)
    blockedName.assertFlashMessage(
      'error',
      'This name is still reserved by a boat in the trash. Restore it or delete it permanently.'
    )
    assert.isNull(await Boat.findBy('name', 'Two'))

    const blockedRegistration = await client
      .post('/boats')
      .loginAs(user)
      .form({ name: 'Other', propulsionType: 'motorboat', registrationNumber: 'FR-HELD' })
      .redirects(0)
    blockedRegistration.assertFlashMessage(
      'error',
      'This registration number is still reserved by a boat in the trash. Restore it or delete it permanently.'
    )

    const created = await client
      .post('/boats')
      .loginAs(user)
      .form({ name: 'Three', propulsionType: 'motorboat' })
      .redirects(0)
    created.assertStatus(302)
    assert.isNotNull(await Boat.findBy('name', 'Three'))

    const restore = await client.post(`/boats/${second.id}/restore`).loginAs(user).redirects(0)
    restore.assertFlashMessage('errorAction', '/settings/billing')
    assert.isNull(await Boat.find(second.id))
  })

  test('an active fleet may reuse a name that is not in the trash', async ({ client, assert }) => {
    const user = await createAdminUser()
    await BoatFactory.merge({ organizationId: user.organizationId!, name: 'Twin' }).create()

    const response = await client
      .post('/boats')
      .loginAs(user)
      .form({ name: 'Twin', propulsionType: 'motorboat' })
      .redirects(0)

    response.assertStatus(302)
    const twins = await Boat.query().where('name', 'Twin')
    assert.lengthOf(twins, 2)
  })

  test('force delete removes the boat and its engine', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    await client.delete(`/boats/${boat.id}`).loginAs(user)

    const response = await client.delete(`/boats/${boat.id}/force`).loginAs(user).redirects(0)

    response.assertHeader('location', '/boats?trashed=1')
    assert.isNull(await withTrashed(Boat.query().where('id', boat.id)).first())
    assert.isNull(await BoatEngine.find(engine.id))
  })

  test('the daily purge deletes boats trashed for more than 30 days', async ({ assert }) => {
    const user = await createAdminUser()
    const recent = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const old = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    recent.deletedAt = DateTime.now().minus({ days: 10 })
    old.deletedAt = DateTime.now().minus({ days: 31 })
    await recent.save()
    await old.save()

    const trash = await app.container.make(BoatTrashService)
    const purged = await trash.purgeExpired()

    assert.equal(purged, 1)
    assert.isNotNull(await withTrashed(Boat.query().where('id', recent.id)).first())
    assert.isNull(await withTrashed(Boat.query().where('id', old.id)).first())
  })

  test('restoring a sold boat does not consume quota', async ({ client, assert }) => {
    const user = await createAdminUser('starter')
    const sold = await BoatFactory.merge({
      organizationId: user.organizationId!,
      status: 'sold',
    }).create()
    await BoatFactory.merge({ organizationId: user.organizationId! }).createMany(2)
    await client.delete(`/boats/${sold.id}`).loginAs(user)

    const response = await client.post(`/boats/${sold.id}/restore`).loginAs(user).redirects(0)

    response.assertHeader('location', `/boats/${sold.id}`)
    const restored = await Boat.find(sold.id)
    assert.equal(restored!.status, 'sold')
  })
})
