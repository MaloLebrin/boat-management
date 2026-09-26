import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatIncidentFactory } from '#database/factories/boat_incident_factory'
import { BoatMaintenanceTaskFactory } from '#database/factories/boat_maintenance_task_factory'
import { InvoiceFactory } from '#database/factories/invoice_factory'
import { NavigationLogFactory } from '#database/factories/navigation_log_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import OrganizationModuleService from '#services/organization_module_service'
import {
  createAdminUser,
  createCharterAdminUser,
  createEnterpriseAdminUser,
} from '#tests/functional/helpers'
import type {
  DashboardActiveTrips,
  DashboardAttention,
  DashboardFleetStatus,
  DashboardPulseStats,
  DashboardUpcomingReservation,
} from '#shared/types/dashboard'

interface DashboardProps {
  attention: DashboardAttention
  pulse: DashboardPulseStats
  activeTrips: DashboardActiveTrips
  fleetStatus: DashboardFleetStatus
  upcomingReservations?: DashboardUpcomingReservation[]
  urgentMaintenance?: unknown
}

test.group('Dashboard — props de la refonte du contenu (#832)', (group) => {
  group.each.setup(() => truncateDb())

  test('ships the mixed attention list and no longer the raw urgent rows', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    await BoatMaintenanceTaskFactory.merge({ boatId: boat.id }).apply('overdue').create()
    await BoatIncidentFactory.merge({
      boatId: boat.id,
      organizationId: admin.organizationId!,
      occurredAt: DateTime.now().minus({ days: 2 }),
    }).create()

    await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: admin.organizationId!,
    }).create()

    const page = await client.get('/dashboard').loginAs(admin).withInertia()
    page.assertInertiaComponent('dashboard')
    const props = page.inertiaProps as DashboardProps

    assert.notProperty(props, 'urgentMaintenance')
    assert.equal(props.pulse.windowDays, 30)
    assert.equal(props.activeTrips.total, 1)
    assert.deepEqual(props.fleetStatus, { total: 1, atSea: 1, inPort: 0, enginesInMaintenance: 0 })
    // Plan pro sans module Location : pas de départs
    assert.notProperty(props, 'upcomingReservations')
    assert.equal(props.attention.counts.maintenanceOverdue, 1)
    assert.equal(props.attention.counts.incidentsOpen, 1)
    assert.deepEqual(
      props.attention.items.map((i) => i.kind),
      ['maintenance', 'incident']
    )
    // Plan pro sans module CRM : pas de factures dans « À traiter »
    assert.isFalse(props.attention.canViewInvoices)
  })

  test('lists unpaid invoices only when the CRM module is active', async ({ client, assert }) => {
    const admin = await createEnterpriseAdminUser()
    await new OrganizationModuleService().grantModule(admin.organizationId!, 'crm_invoicing', {
      source: 'subscription',
    })
    await InvoiceFactory.merge({ organizationId: admin.organizationId! })
      .apply('invoice')
      .apply('overdue')
      .create()

    const page = await client.get('/dashboard').loginAs(admin).withInertia()
    const props = page.inertiaProps as DashboardProps

    assert.isTrue(props.attention.canViewInvoices)
    assert.equal(props.attention.counts.invoicesOverdue, 1)
    assert.equal(props.attention.items[0]?.kind, 'invoice')
  })

  test('ships upcoming departures only with the charter module', async ({ client, assert }) => {
    const admin = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: admin.organizationId!,
      status: 'confirmed',
      startsAt: DateTime.now().plus({ days: 2 }),
      endsAt: DateTime.now().plus({ days: 5 }),
    }).create()

    const page = await client.get('/dashboard').loginAs(admin).withInertia()
    const props = page.inertiaProps as DashboardProps

    assert.isArray(props.upcomingReservations)
    assert.equal(props.upcomingReservations!.length, 1)
    assert.equal(props.upcomingReservations![0]!.event, 'departure')
  })
})
