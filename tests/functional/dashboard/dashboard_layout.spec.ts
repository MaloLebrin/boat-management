import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatMaintenanceTaskFactory } from '#database/factories/boat_maintenance_task_factory'
import { UserFactory } from '#database/factories/user_factory'
import {
  createAdminUser,
  createCharterAdminUser,
  createEnterpriseAdminUser,
  createMemberUser,
} from '#tests/functional/helpers'
import type { DashboardPlannedTasks } from '#shared/types/dashboard'
import type { ResolvedDashboardLayout } from '#shared/types/dashboard_layout'

interface DashboardProps {
  layout: ResolvedDashboardLayout
  activity?: unknown
  spend?: unknown
  plannedTasks?: DashboardPlannedTasks
  upcomingReservations?: unknown
  aiFleetAnalysisAt: string | null
}

test.group('Dashboard — disposition personnalisable', (group) => {
  group.each.setup(() => truncateDb())

  test('PUT /dashboard/layout persists the order and the hidden widgets', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()

    const response = await client
      .put('/dashboard/layout')
      .loginAs(admin)
      .json({
        order: {
          main: ['boats', 'attention', 'activity', 'at_sea', 'upcoming_reservations'],
          side: ['spend', 'ai_panel', 'ports', 'planned_tasks', 'notifications'],
        },
        hidden: ['activity', 'kpis'],
      })
      .redirects(0)

    response.assertStatus(302)

    await admin.refresh()
    assert.isNotNull(admin.dashboardLayout)
    // `upcoming_reservations` (module Location inactif) et `ports` (plan pro
    // sans profil) sont retirés à l'enregistrement.
    assert.deepEqual(admin.dashboardLayout!.order.main, [
      'boats',
      'attention',
      'activity',
      'at_sea',
    ])
    assert.deepEqual(admin.dashboardLayout!.order.side, [
      'spend',
      'ai_panel',
      'planned_tasks',
      'notifications',
    ])
    assert.deepEqual(admin.dashboardLayout!.hidden, ['activity', 'kpis'])
  })

  test('PUT /dashboard/layout rejects unknown or duplicated widget ids', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()

    const unknown = await client
      .put('/dashboard/layout')
      .loginAs(admin)
      .json({ order: { main: ['weather'], side: [] }, hidden: [] })
      .redirects(0)
    unknown.assertStatus(302)

    const duplicated = await client
      .put('/dashboard/layout')
      .loginAs(admin)
      .json({ order: { main: ['boats', 'boats'], side: [] }, hidden: [] })
      .redirects(0)
    duplicated.assertStatus(302)

    await admin.refresh()
    assert.isNull(admin.dashboardLayout)
  })

  test('PUT /dashboard/layout moves a misplaced widget back to its own column', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()

    await client
      .put('/dashboard/layout')
      .loginAs(admin)
      .json({ order: { main: ['ai_panel', 'boats'], side: ['attention'] }, hidden: [] })
      .redirects(0)

    await admin.refresh()
    // Les ids mal zonés sont ignorés ; les widgets absents de la liste envoyée
    // reprennent leur position par défaut (« À traiter » revient en tête).
    assert.deepEqual(admin.dashboardLayout!.order.main, [
      'attention',
      'at_sea',
      'activity',
      'boats',
    ])
    assert.deepEqual(admin.dashboardLayout!.order.side, [
      'ai_panel',
      'spend',
      'planned_tasks',
      'notifications',
    ])
  })

  test('PUT and DELETE /dashboard/layout require authentication', async ({ client }) => {
    const put = await client
      .put('/dashboard/layout')
      .json({ order: { main: [], side: [] }, hidden: [] })
      .redirects(0)
    put.assertStatus(302)
    put.assertHeader('location', '/login')

    const del = await client.delete('/dashboard/layout').redirects(0)
    del.assertStatus(302)
    del.assertHeader('location', '/login')
  })

  test('DELETE /dashboard/layout restores the default layout', async ({ client, assert }) => {
    const admin = await createAdminUser()
    admin.dashboardLayout = {
      version: 1,
      order: { main: ['boats', 'attention'], side: ['ai_panel'] },
      hidden: ['activity'],
    }
    await admin.save()

    const response = await client.delete('/dashboard/layout').loginAs(admin).redirects(0)
    response.assertStatus(302)

    await admin.refresh()
    assert.isNull(admin.dashboardLayout)
  })

  test('GET /dashboard sends the default layout without the unavailable widgets', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)

    const adminPage = await client.get('/dashboard').loginAs(admin).withInertia()
    const adminProps = adminPage.inertiaProps as DashboardProps
    assert.isFalse(adminProps.layout.isCustomized)
    assert.deepEqual(adminProps.layout.order.top, ['kpis'])
    assert.deepEqual(adminProps.layout.order.main, ['attention', 'at_sea', 'activity', 'boats'])
    // Pro sans profil : pas de cartographie de port.
    assert.deepEqual(adminProps.layout.order.side, [
      'ai_panel',
      'spend',
      'planned_tasks',
      'notifications',
    ])
    assert.deepEqual(adminProps.layout.hidden, [])

    const memberPage = await client.get('/dashboard').loginAs(member).withInertia()
    const memberProps = memberPage.inertiaProps as DashboardProps
    assert.notInclude(memberProps.layout.order.side, 'spend')

    const enterprise = await createEnterpriseAdminUser()
    const enterprisePage = await client.get('/dashboard').loginAs(enterprise).withInertia()
    const enterpriseProps = enterprisePage.inertiaProps as DashboardProps
    assert.include(enterpriseProps.layout.order.side, 'ports')

    const charter = await createCharterAdminUser()
    const charterPage = await client.get('/dashboard').loginAs(charter).withInertia()
    const charterProps = charterPage.inertiaProps as DashboardProps
    assert.include(charterProps.layout.order.main, 'upcoming_reservations')
  })

  test('GET /dashboard omits the props of hidden widgets', async ({ client, assert }) => {
    const admin = await createCharterAdminUser()
    admin.dashboardLayout = {
      version: 1,
      order: {
        main: ['boats', 'attention', 'at_sea', 'upcoming_reservations', 'activity'],
        side: ['ai_panel', 'spend', 'planned_tasks', 'notifications'],
      },
      hidden: ['activity', 'spend', 'planned_tasks', 'upcoming_reservations', 'ai_panel'],
    }
    await admin.save()

    const response = await client.get('/dashboard').loginAs(admin).withInertia()
    response.assertStatus(200)
    const props = response.inertiaProps as DashboardProps

    assert.isTrue(props.layout.isCustomized)
    assert.equal(props.layout.order.main[0], 'boats')
    assert.notProperty(props, 'activity')
    assert.notProperty(props, 'spend')
    assert.notProperty(props, 'plannedTasks')
    assert.notProperty(props, 'upcomingReservations')
    assert.isNull(props.aiFleetAnalysisAt)
  })

  test('the deferred plannedTasks prop lists open dated tasks due within 30 days', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const today = DateTime.now().startOf('day')

    // Hors fenêtre : en retard, au-delà de 30 jours, réalisée, sans date.
    await BoatMaintenanceTaskFactory.merge({ boatId: boat.id }).apply('overdue').create()
    await BoatMaintenanceTaskFactory.merge({
      boatId: boat.id,
      dueAt: today.plus({ days: 31 }),
    }).create()
    await BoatMaintenanceTaskFactory.merge({ boatId: boat.id }).apply('done').create()
    await BoatMaintenanceTaskFactory.merge({ boatId: boat.id }).apply('noDueDate').create()
    // Dans la fenêtre : aujourd'hui, J+30 et 5 autres → 7 au total, 5 affichées.
    await BoatMaintenanceTaskFactory.merge({
      boatId: boat.id,
      title: 'Today task',
      dueAt: today,
    }).create()
    await BoatMaintenanceTaskFactory.merge({
      boatId: boat.id,
      dueAt: today.plus({ days: 30 }),
    }).create()
    for (let i = 1; i <= 5; i++) {
      await BoatMaintenanceTaskFactory.merge({
        boatId: boat.id,
        dueAt: today.plus({ days: i }),
      }).create()
    }

    const response = await client
      .get('/dashboard')
      .loginAs(admin)
      .withInertia()
      .withInertiaPartialReload('dashboard', ['plannedTasks'])
    response.assertStatus(200)
    const props = response.inertiaProps as DashboardProps

    assert.equal(props.plannedTasks!.total, 7)
    assert.lengthOf(props.plannedTasks!.items, 5)
    assert.equal(props.plannedTasks!.items[0]!.title, 'Today task')
    assert.equal(props.plannedTasks!.items[0]!.dueAt, today.toISODate())
    assert.equal(props.plannedTasks!.items[0]!.boatName, boat.name)
    const dates = props.plannedTasks!.items.map((item) => item.dueAt)
    assert.deepEqual(dates, [...dates].sort())
  })

  test('a user without organisation gets the default layout and an empty planned list', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()

    const page = await client.get('/dashboard').loginAs(user).withInertia()
    page.assertStatus(200)
    const layout = (page.inertiaProps as DashboardProps).layout
    assert.isFalse(layout.isCustomized)
    assert.notInclude(layout.order.side, 'ports')
    assert.notInclude(layout.order.side, 'spend')

    const reload = await client
      .get('/dashboard')
      .loginAs(user)
      .withInertia()
      .withInertiaPartialReload('dashboard', ['plannedTasks'])
    reload.assertStatus(200)
    assert.deepEqual((reload.inertiaProps as DashboardProps).plannedTasks, { items: [], total: 0 })
  })
})
