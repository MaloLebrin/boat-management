import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import Invoice from '#models/invoice'
import MarkOverdueInvoices from '#jobs/mark_overdue_invoices'
import { InvoiceFactory } from '#database/factories/invoice_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'

/**
 * Passage des factures en retard — cron quotidien 06:00 (#699).
 *
 * Quatre conditions doivent être réunies pour qu'une facture bascule : c'est une
 * facture (pas un devis), elle est `sent`, elle n'est pas payée, et son échéance
 * est passée. Le job n'était pas testé, donc aucune de ces quatre n'était figée
 * — et chacune, relâchée, marque « en retard » un document qui ne l'est pas.
 *
 * Un devis marqué en retard, ou une facture déjà payée qui repasse en retard,
 * c'est une relance envoyée à un client qui a déjà réglé.
 */

async function run() {
  const job = await app.container.make(MarkOverdueInvoices)
  await job.execute()
}

async function statusOf(invoice: Invoice) {
  const reloaded = await Invoice.findOrFail(invoice.id)
  return reloaded.status
}

test.group('MarkOverdueInvoices (cron 06:00)', () => {
  test('an unpaid sent invoice past its due date becomes overdue', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const invoice = await InvoiceFactory.merge({ organizationId: org.id })
      .apply('invoice')
      .apply('overdue')
      .create()

    await run()

    assert.equal(await statusOf(invoice), 'overdue')
  })

  test('a quote is never marked overdue, however late', async ({ assert }) => {
    // Un devis n'engage personne : le relancer serait une erreur commerciale.
    const org = await OrganizationFactory.create()
    const quote = await InvoiceFactory.merge({
      organizationId: org.id,
      status: 'sent',
      dueAt: DateTime.now().minus({ days: 30 }),
    }).create()

    await run()

    assert.equal(await statusOf(quote), 'sent')
  })

  test('a paid invoice stays paid', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const invoice = await InvoiceFactory.merge({
      organizationId: org.id,
      dueAt: DateTime.now().minus({ days: 30 }),
    })
      .apply('invoice')
      .apply('paid')
      .create()

    await run()

    assert.equal(await statusOf(invoice), 'paid')
  })

  test('an invoice not yet due stays sent', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const invoice = await InvoiceFactory.merge({ organizationId: org.id })
      .apply('invoice')
      .apply('sent')
      .create()

    await run()

    assert.equal(await statusOf(invoice), 'sent')
  })

  test('a draft invoice is left alone', async ({ assert }) => {
    // Une facture jamais envoyée ne peut pas être « en retard » : le client ne
    // l'a pas reçue.
    const org = await OrganizationFactory.create()
    const invoice = await InvoiceFactory.merge({
      organizationId: org.id,
      dueAt: DateTime.now().minus({ days: 30 }),
    })
      .apply('invoice')
      .create()

    await run()

    assert.equal(await statusOf(invoice), 'draft')
  })

  test('running twice changes nothing the second time', async ({ assert }) => {
    // Le cron tourne tous les jours sur le même jeu : il doit être idempotent.
    const org = await OrganizationFactory.create()
    const invoice = await InvoiceFactory.merge({ organizationId: org.id })
      .apply('invoice')
      .apply('overdue')
      .create()

    await run()
    const after = await Invoice.findOrFail(invoice.id)
    await run()

    const twice = await Invoice.findOrFail(invoice.id)
    assert.equal(twice.status, 'overdue')
    assert.equal(twice.updatedAt.toISO(), after.updatedAt.toISO())
  })
})
