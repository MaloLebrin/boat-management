import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import DashboardAttentionService from '#services/dashboard_attention_service'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatIncidentFactory } from '#database/factories/boat_incident_factory'
import { BoatDocumentFactory } from '#database/factories/boat_document_factory'
import { InvoiceFactory } from '#database/factories/invoice_factory'
import type { DashboardStats, DashboardUrgentMaintenanceRow } from '#shared/types/dashboard'

const TODAY = DateTime.now().startOf('day')
const todayIso = TODAY.toISODate()!

function stats(urgent: number, overdue: number): DashboardStats {
  return {
    boats: 1,
    engines: 0,
    sails: 0,
    rigs: 0,
    urgentMaintenance: urgent,
    deltas: {
      boatsInAlert: 1,
      boatsWithEngine: 0,
      boatsWithSail: 0,
      boatsWithRig: 0,
      overdueCount: overdue,
    },
  }
}

function dateRow(id: number, boatId: number, dueAt: string): DashboardUrgentMaintenanceRow {
  return {
    id,
    boatId,
    boatName: 'Albatros',
    subject: 'engine',
    title: `Task ${id}`,
    kind: 'date',
    dueAt,
    dueEngineHours: null,
    currentEngineHours: null,
  }
}

test.group('DashboardAttentionService (#832)', () => {
  test('merges every kind, danger first then oldest date, and caps the list at 6', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const orgId = user.organizationId!
    const boat = await BoatFactory.merge({ organizationId: orgId }).create()

    await BoatDocumentFactory.merge({
      boatId: boat.id,
      organizationId: orgId,
      type: 'insurance',
      expiresAt: TODAY.minus({ days: 20 }),
    }).create()
    await BoatDocumentFactory.merge({
      boatId: boat.id,
      organizationId: orgId,
      expiresAt: TODAY.plus({ days: 10 }),
    }).create()
    await BoatIncidentFactory.merge({
      boatId: boat.id,
      organizationId: orgId,
      occurredAt: TODAY.minus({ days: 3 }),
    }).create()

    const rows = [
      dateRow(1, boat.id, TODAY.minus({ days: 2 }).toISODate()!),
      dateRow(2, boat.id, TODAY.plus({ days: 5 }).toISODate()!),
      dateRow(3, boat.id, TODAY.plus({ days: 1 }).toISODate()!),
      dateRow(4, boat.id, TODAY.plus({ days: 6 }).toISODate()!),
      dateRow(5, boat.id, TODAY.plus({ days: 7 }).toISODate()!),
    ]

    const svc = new DashboardAttentionService()
    const result = await svc.getForUser(user, rows, stats(5, 1), {
      canViewInvoices: false,
      today: todayIso,
    })

    assert.equal(result.items.length, 6)
    // danger : document expiré (J-20) avant tâche en retard (J-2) ; puis warning par date
    assert.deepEqual(
      result.items.map((i) => `${i.kind}:${i.severity}`),
      [
        'document:danger',
        'maintenance:danger',
        'incident:warning',
        'maintenance:warning',
        'maintenance:warning',
        'maintenance:warning',
      ]
    )
    assert.deepEqual(result.counts, {
      maintenanceOverdue: 1,
      maintenanceSoon: 4,
      incidentsOpen: 1,
      documentsExpired: 1,
      documentsExpiring: 1,
      invoicesOverdue: 0,
      total: 8,
    })
    assert.isFalse(result.canViewInvoices)
  })

  test('counts incidents and documents exactly beyond the per-kind fetch window', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const orgId = user.organizationId!
    const boat = await BoatFactory.merge({ organizationId: orgId }).create()
    await BoatIncidentFactory.merge({ boatId: boat.id, organizationId: orgId }).createMany(8)
    await BoatIncidentFactory.merge({ boatId: boat.id, organizationId: orgId })
      .apply('closed')
      .create()
    await BoatDocumentFactory.merge({
      boatId: boat.id,
      organizationId: orgId,
      expiresAt: TODAY.minus({ days: 1 }),
    }).createMany(7)
    // Sans échéance : jamais compté
    await BoatDocumentFactory.merge({ boatId: boat.id, organizationId: orgId }).create()

    const result = await new DashboardAttentionService().getForUser(user, [], stats(0, 0), {
      canViewInvoices: false,
      today: todayIso,
    })

    assert.equal(result.counts.incidentsOpen, 8)
    assert.equal(result.counts.documentsExpired, 7)
    assert.equal(result.counts.documentsExpiring, 0)
    assert.equal(result.items.length, 6)
    assert.equal(result.counts.total, 15)
  })

  test('ignores other organizations and only lists invoices when allowed', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const orgId = user.organizationId!
    const other = await UserFactory.with('organization').create()
    const otherBoat = await BoatFactory.merge({ organizationId: other.organizationId! }).create()
    await BoatIncidentFactory.merge({
      boatId: otherBoat.id,
      organizationId: other.organizationId!,
    }).create()

    // Envoyée, échéance dépassée, pas encore basculée par le job quotidien
    await InvoiceFactory.merge({ organizationId: orgId }).apply('invoice').apply('overdue').create()
    // Déjà marquée en retard par le job
    await InvoiceFactory.merge({ organizationId: orgId, status: 'overdue' })
      .apply('invoice')
      .create()
    // Payée, ou envoyée mais pas encore échue : hors liste
    await InvoiceFactory.merge({ organizationId: orgId }).apply('invoice').apply('paid').create()
    await InvoiceFactory.merge({ organizationId: orgId }).apply('invoice').apply('sent').create()
    // Un devis échu n'est pas une facture
    await InvoiceFactory.merge({ organizationId: orgId }).apply('overdue').create()

    const svc = new DashboardAttentionService()
    const denied = await svc.getForUser(user, [], stats(0, 0), {
      canViewInvoices: false,
      today: todayIso,
    })
    assert.equal(denied.counts.incidentsOpen, 0)
    assert.equal(denied.counts.invoicesOverdue, 0)
    assert.equal(denied.items.length, 0)

    const allowed = await svc.getForUser(user, [], stats(0, 0), {
      canViewInvoices: true,
      today: todayIso,
    })
    assert.equal(allowed.counts.invoicesOverdue, 2)
    assert.equal(allowed.items.length, 2)
    const item = allowed.items[0]!
    assert.equal(item.kind, 'invoice')
    assert.equal(item.severity, 'danger')
    assert.equal(item.href, '/invoices?status=overdue')
    assert.isTrue(allowed.canViewInvoices)
  })

  test('maps maintenance rows without any query and puts hour-based tasks last', async ({
    assert,
  }) => {
    const user = await UserFactory.merge({ organizationId: null }).create()
    const hours: DashboardUrgentMaintenanceRow = {
      id: 9,
      boatId: 1,
      boatName: 'Sirocco',
      subject: 'engine',
      title: 'Hours',
      kind: 'hours',
      dueAt: null,
      dueEngineHours: 350,
      currentEngineHours: 342,
    }
    const result = await new DashboardAttentionService().getForUser(
      user,
      [hours, dateRow(1, 1, TODAY.plus({ days: 2 }).toISODate()!)],
      stats(2, 0),
      { canViewInvoices: false, today: todayIso }
    )
    assert.deepEqual(
      result.items.map((i) => i.key),
      ['maintenance:1', 'maintenance:9']
    )
    const first = result.items[0]!
    assert.equal(first.kind, 'maintenance')
    assert.equal(first.href, '/planning?task=1')
    assert.equal(result.counts.total, 2)
  })
})
