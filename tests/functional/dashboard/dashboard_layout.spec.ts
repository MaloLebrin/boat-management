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
import { InvoiceFactory } from '#database/factories/invoice_factory'
import OrganizationModuleService from '#services/organization_module_service'
import type {
  DashboardCharterOccupancy,
  DashboardFuelSummary,
  DashboardInvoicingSummary,
  DashboardLowStockParts,
  DashboardPlannedTasks,
  DashboardSafetyCompliance,
} from '#shared/types/dashboard'
import type { ResolvedDashboardLayout } from '#shared/types/dashboard_layout'

interface DashboardProps {
  layout: ResolvedDashboardLayout
  activity?: unknown
  spend?: unknown
  plannedTasks?: DashboardPlannedTasks
  upcomingReservations?: unknown
  aiFleetAnalysisAt: string | null
  safetyCompliance?: DashboardSafetyCompliance
  fuel?: DashboardFuelSummary
  lowStock?: DashboardLowStockParts
  invoicing?: DashboardInvoicingSummary
  charterOccupancy?: DashboardCharterOccupancy
}

/** Widgets de la galerie disponibles sans module (masqués par défaut). */
const GALLERY_BASE = ['safety_compliance', 'fuel', 'low_stock'] as const
const GALLERY_PROPS = ['safetyCompliance', 'fuel', 'lowStock', 'invoicing', 'charterOccupancy']

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
    // Les widgets de la galerie, absents du corps, sont réinsérés et masqués explicitement.
    assert.deepEqual(admin.dashboardLayout!.order.side, [
      'spend',
      'ai_panel',
      'planned_tasks',
      'notifications',
      ...GALLERY_BASE,
    ])
    assert.deepEqual(admin.dashboardLayout!.hidden, ['activity', 'kpis', ...GALLERY_BASE])
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
      ...GALLERY_BASE,
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
    // Pro sans profil : pas de cartographie de port, ni Facturation ni Occupation
    // (modules absents) ; les widgets de la galerie sont masqués par défaut.
    assert.deepEqual(adminProps.layout.order.side, [
      'ai_panel',
      'spend',
      'planned_tasks',
      'notifications',
      ...GALLERY_BASE,
    ])
    assert.deepEqual(adminProps.layout.hidden, [...GALLERY_BASE])
    for (const prop of GALLERY_PROPS) assert.notProperty(adminProps, prop)

    const memberPage = await client.get('/dashboard').loginAs(member).withInertia()
    const memberProps = memberPage.inertiaProps as DashboardProps
    assert.notInclude(memberProps.layout.order.side, 'spend')
    assert.include(memberProps.layout.hidden, 'fuel')

    const enterprise = await createEnterpriseAdminUser()
    const enterprisePage = await client.get('/dashboard').loginAs(enterprise).withInertia()
    const enterpriseProps = enterprisePage.inertiaProps as DashboardProps
    assert.include(enterpriseProps.layout.order.side, 'ports')
    // Entreprise : modules inclus → Facturation et Occupation disponibles (masqués).
    assert.include(enterpriseProps.layout.order.side, 'invoicing')
    assert.include(enterpriseProps.layout.order.side, 'charter_occupancy')
    assert.include(enterpriseProps.layout.hidden, 'invoicing')

    const charter = await createCharterAdminUser()
    const charterPage = await client.get('/dashboard').loginAs(charter).withInertia()
    const charterProps = charterPage.inertiaProps as DashboardProps
    assert.include(charterProps.layout.order.main, 'upcoming_reservations')
    assert.include(charterProps.layout.order.side, 'charter_occupancy')
    assert.notInclude(charterProps.layout.order.side, 'invoicing')
  })

  test('the gallery widgets are deferred once the stored layout shows them', async ({
    client,
    assert,
  }) => {
    const admin = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    await InvoiceFactory.merge({ organizationId: admin.organizationId!, total: '150.00' })
      .apply('invoice')
      .apply('sent')
      .create()
    admin.dashboardLayout = {
      version: 1,
      order: {
        main: ['attention', 'at_sea', 'upcoming_reservations', 'activity', 'boats'],
        side: [
          'safety_compliance',
          'fuel',
          'low_stock',
          'invoicing',
          'charter_occupancy',
          'ai_panel',
          'spend',
          'ports',
          'planned_tasks',
          'notifications',
        ],
      },
      hidden: [],
    }
    await admin.save()

    // Visite complète : la disposition servie ne masque plus rien.
    const page = await client.get('/dashboard').loginAs(admin).withInertia()
    page.assertStatus(200)
    assert.deepEqual((page.inertiaProps as DashboardProps).layout.hidden, [])

    // Rechargement partiel des cinq groupes différés (la prop `layout` n'en fait pas partie).
    const response = await client
      .get('/dashboard')
      .loginAs(admin)
      .withInertia()
      .withInertiaPartialReload('dashboard', GALLERY_PROPS)
    response.assertStatus(200)
    const props = response.inertiaProps as DashboardProps

    // Sans zone d'armement : aucun contrôle, mais une réponse (jamais `null`, #478).
    assert.deepEqual(props.safetyCompliance, {
      checked: 0,
      compliant: 0,
      withIssues: 0,
      withoutZone: 1,
      items: [],
    })
    assert.equal(props.fuel!.windowDays, 30)
    assert.equal(props.fuel!.fillUps, 0)
    assert.deepEqual(props.lowStock, { items: [], total: 0, lowStockCount: 0, toReplaceCount: 0 })
    assert.equal(props.invoicing!.outstandingTotal, 150)
    assert.equal(props.invoicing!.outstandingCount, 1)
    assert.equal(props.charterOccupancy!.boats, 1)
    assert.equal(props.charterOccupancy!.occupancyRate, 0)
    assert.equal(boat.organizationId, admin.organizationId)
  })

  test('a widget gated by a module stays out of the layout even when the stored order lists it', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    admin.dashboardLayout = {
      version: 1,
      order: {
        main: ['attention', 'at_sea', 'activity', 'boats'],
        side: [
          'invoicing',
          'charter_occupancy',
          'ai_panel',
          'spend',
          'planned_tasks',
          'notifications',
        ],
      },
      hidden: [],
    }
    await admin.save()

    const before = await client.get('/dashboard').loginAs(admin).withInertia()
    const beforeProps = before.inertiaProps as DashboardProps
    assert.notInclude(beforeProps.layout.order.side, 'invoicing')
    assert.notProperty(beforeProps, 'invoicing')

    // Module CRM/Facturation activé : le widget rejoint la disposition servie et sa donnée est différée.
    await new OrganizationModuleService().grantModule(admin.organizationId!, 'crm_invoicing', {
      source: 'subscription',
    })
    const after = await client.get('/dashboard').loginAs(admin).withInertia()
    assert.include((after.inertiaProps as DashboardProps).layout.order.side, 'invoicing')
    const reload = await client
      .get('/dashboard')
      .loginAs(admin)
      .withInertia()
      .withInertiaPartialReload('dashboard', ['invoicing'])
    assert.equal((reload.inertiaProps as DashboardProps).invoicing!.pendingQuotes, 0)
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
    // Les widgets de la galerie, absents de l'ordre stocké, restent masqués et omis.
    assert.include(props.layout.hidden, 'charter_occupancy')
    for (const prop of GALLERY_PROPS) assert.notProperty(props, prop)
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
