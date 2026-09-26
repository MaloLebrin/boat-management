import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import InvoiceService from '#services/invoice_service'
import Organization from '#models/organization'
import { InvoiceFactory } from '#database/factories/invoice_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'

test.group('InvoiceService.getDashboardSummary (widget « Facturation »)', () => {
  test('sums outstanding, overdue and collected-this-month invoices and counts pending quotes', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.create()
    const now = DateTime.now()
    const today = now.startOf('day')
    const make = (over: Record<string, unknown>, ...states: string[]) => {
      let factory = InvoiceFactory.merge({ organizationId: org.id, ...over })
      for (const state of states) factory = factory.apply(state as never)
      return factory.create()
    }

    // Encours seul : envoyée, échéance à venir.
    await make({ total: '120.00' }, 'invoice', 'sent')
    // Impayées : statut `overdue`, et envoyée avec échéance dépassée (job pas encore passé).
    await make({ total: '200.00', status: 'overdue', dueAt: today.minus({ days: 5 }) }, 'invoice')
    await make({ total: '40.00' }, 'invoice', 'overdue')
    // Encaissé ce mois, puis le mois dernier (hors compteur).
    await make({ total: '300.00' }, 'invoice', 'paid')
    await make(
      { total: '999.00', status: 'paid', paidAt: now.startOf('month').minus({ days: 1 }) },
      'invoice'
    )
    // Brouillon et annulée : ni encours ni impayées.
    await make({ total: '999.00' }, 'invoice')
    await make({ total: '999.00', status: 'cancelled' }, 'invoice')
    // Devis : deux en attente, un annulé.
    await make({})
    await make({}, 'sent')
    await make({ status: 'cancelled' })
    // Autre organisation.
    const other = await OrganizationFactory.create()
    await InvoiceFactory.merge({ organizationId: other.id, total: '999.00' })
      .apply('invoice')
      .apply('overdue')
      .create()

    const svc = await app.container.make(InvoiceService)
    const summary = await svc.getDashboardSummary(org, now)

    assert.deepEqual(summary, {
      outstandingTotal: 360,
      outstandingCount: 3,
      overdueTotal: 240,
      overdueCount: 2,
      paidThisMonthTotal: 300,
      paidThisMonthCount: 1,
      pendingQuotes: 2,
    })

    const empty = await svc.getDashboardSummary(await Organization.findOrFail(other.id), now)
    assert.equal(empty.outstandingCount, 1)
    assert.equal(empty.pendingQuotes, 0)
  })
})
