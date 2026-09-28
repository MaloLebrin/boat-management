import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { InvoiceFactory } from '#database/factories/invoice_factory'
import AuditLog from '#models/audit_log'
import Invoice from '#models/invoice'
import InvoiceLine from '#models/invoice_line'
import InvoiceService from '#services/invoice_service'
import {
  createEnterpriseAdminUser,
  createMechanicUser,
  createProPlanUser,
} from '#tests/functional/helpers'
import { assertPageContract } from '#tests/support/inertia_page'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'

/**
 * Avoirs (#877) : une facture émise ne se corrige pas, elle s'avoire.
 *
 * `POST /invoices/:id/credit-notes` émet un avoir — une pièce `credit_note`
 * numérotée `AV-`, liée à la facture, montants positifs. La somme des avoirs
 * ne dépasse jamais le total de la facture ; quand elle l'atteint, la facture
 * passe à `credited`.
 */

/** Facture émise de 120 € TTC (HT 80 + 20, TVA 20 %). */
async function issuedInvoice(organizationId: number, state: 'sent' | 'paid' = 'sent') {
  const invoice = await InvoiceFactory.merge({ organizationId })
    .apply('invoice')
    .apply(state)
    .create()
  await InvoiceLine.createMany([
    {
      invoiceId: invoice.id,
      label: 'Location',
      quantity: '1',
      unitPrice: '80',
      amount: '80',
      position: 0,
    },
    {
      invoiceId: invoice.id,
      label: 'Skipper',
      quantity: '1',
      unitPrice: '20',
      amount: '20',
      position: 1,
    },
  ])
  return invoice
}

function creditNotesOf(invoice: Invoice) {
  return Invoice.query()
    .where('kind', 'credit_note')
    .where('creditedInvoiceId', invoice.id)
    .preload('lines', (q) => q.orderBy('position'))
    .orderBy('id')
}

test.group('Avoirs — émission', (group) => {
  group.each.setup(() => truncateDb())

  test('sans lignes, l’avoir est total : miroir de la facture, qui passe à credited', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await issuedInvoice(user.organizationId!)

    const response = await client
      .post(`/invoices/${invoice.id}/credit-notes`)
      .loginAs(user)
      .json({ reason: 'Réservation annulée' })
      .redirects(0)

    const [note] = await creditNotesOf(invoice)
    response.assertStatus(302)
    response.assertHeader('location', `/invoices/${note.id}`)
    response.assertFlashMessage('success', 'Credit note issued.')

    assert.equal(note.number, 'AV-000001')
    assert.equal(note.status, 'sent')
    assert.equal(note.total, '120.00')
    assert.equal(note.taxRate, '20.00')
    assert.equal(note.clientName, invoice.clientName)
    assert.equal(note.notes, 'Réservation annulée')
    assert.deepEqual(
      note.lines.map((l) => [l.label, l.amount]),
      [
        ['Location', '80.00'],
        ['Skipper', '20.00'],
      ]
    )

    const updated = await Invoice.findOrFail(invoice.id)
    assert.equal(updated.status, 'credited')

    const log = await AuditLog.query().where('action', 'invoice.credit_note_issued').firstOrFail()
    assert.equal(log.entityId, invoice.id)
    assert.equal(log.userId, user.id)
    assert.equal((log.metadata as Record<string, unknown>).creditNoteNumber, 'AV-000001')
  })

  test('un avoir partiel laisse la facture ouverte, un second peut la solder', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await issuedInvoice(user.organizationId!)

    await client
      .post(`/invoices/${invoice.id}/credit-notes`)
      .loginAs(user)
      .json({ reason: 'Remise', lines: [{ label: 'Remise', quantity: 1, unitPrice: 20 }] })
      .redirects(0)

    let updated = await Invoice.findOrFail(invoice.id)
    assert.equal(updated.status, 'sent')

    // Le reste (96 € TTC = 80 HT) : la facture est soldée.
    await client
      .post(`/invoices/${invoice.id}/credit-notes`)
      .loginAs(user)
      .json({ reason: 'Solde', lines: [{ label: 'Solde', quantity: 1, unitPrice: 80 }] })
      .redirects(0)

    const notes = await creditNotesOf(invoice)
    assert.deepEqual(
      notes.map((n) => [n.number, n.total]),
      [
        ['AV-000001', '24.00'],
        ['AV-000002', '96.00'],
      ]
    )
    updated = await Invoice.findOrFail(invoice.id)
    assert.equal(updated.status, 'credited')
  })

  test('un avoir qui dépasse le reste est refusé', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await issuedInvoice(user.organizationId!)

    await client
      .post(`/invoices/${invoice.id}/credit-notes`)
      .loginAs(user)
      .json({ reason: 'Remise', lines: [{ label: 'Remise', quantity: 1, unitPrice: 50 }] })
      .redirects(0)

    const response = await client
      .post(`/invoices/${invoice.id}/credit-notes`)
      .loginAs(user)
      .header('referer', `/invoices/${invoice.id}/credit-note`)
      .json({ reason: 'Trop', lines: [{ label: 'Trop', quantity: 1, unitPrice: 51 }] })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'The credit note amount must be positive and must not exceed what remains to be credited on the invoice.'
    )
    assert.lengthOf(await creditNotesOf(invoice), 1)
  })

  test('sans lignes, un second avoir est refusé : le miroir dépasserait le reste', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await issuedInvoice(user.organizationId!)

    await client
      .post(`/invoices/${invoice.id}/credit-notes`)
      .loginAs(user)
      .json({ reason: 'Remise', lines: [{ label: 'Remise', quantity: 1, unitPrice: 10 }] })
      .redirects(0)

    const response = await client
      .post(`/invoices/${invoice.id}/credit-notes`)
      .loginAs(user)
      .json({ reason: 'Tout' })
      .redirects(0)

    response.assertFlashMessage(
      'error',
      'A credit note was already issued on this invoice: provide the lines of the new credit note.'
    )
    assert.lengthOf(await creditNotesOf(invoice), 1)
  })

  test('un devis, un brouillon ou une facture avoirée ne s’avoirent pas', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const orgId = user.organizationId!
    const quote = await InvoiceFactory.merge({ organizationId: orgId }).apply('sent').create()
    const draft = await InvoiceFactory.merge({ organizationId: orgId }).apply('invoice').create()
    const credited = await InvoiceFactory.merge({ organizationId: orgId, status: 'credited' })
      .apply('invoice')
      .create()

    for (const doc of [quote, draft, credited]) {
      const response = await client
        .post(`/invoices/${doc.id}/credit-notes`)
        .loginAs(user)
        .json({ reason: 'x', lines: [{ label: 'x', quantity: 1, unitPrice: 1 }] })
        .redirects(0)
      response.assertHeader('location', `/invoices/${doc.id}`)
      response.assertFlashMessage(
        'error',
        'A credit note can only be issued on a sent, overdue or paid invoice that is not already fully credited.'
      )
    }
    assert.lengthOf(await Invoice.query().where('kind', 'credit_note'), 0)
  })

  test('une facture payée s’avoire : son paiement reste inscrit', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await issuedInvoice(user.organizationId!, 'paid')

    await client
      .post(`/invoices/${invoice.id}/credit-notes`)
      .loginAs(user)
      .json({ reason: 'Annulation' })
      .redirects(0)

    const updated = await Invoice.findOrFail(invoice.id)
    assert.equal(updated.status, 'credited')
    assert.isNotNull(updated.paidAt)
  })

  test('le motif est obligatoire', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await issuedInvoice(user.organizationId!)

    const response = await client
      .post(`/invoices/${invoice.id}/credit-notes`)
      .loginAs(user)
      .form({ reason: '' })
      .redirects(0)

    response.assertStatus(302)
    const bag = response.flashMessages().inputErrorsBag as Record<string, unknown> | undefined
    assert.property(bag ?? {}, 'reason')
    assert.lengthOf(await creditNotesOf(invoice), 0)
  })

  test('une facture d’une autre organisation est introuvable', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const other = await createEnterpriseAdminUser()
    const invoice = await issuedInvoice(other.organizationId!)

    const response = await client
      .post(`/invoices/${invoice.id}/credit-notes`)
      .loginAs(user)
      .json({ reason: 'x' })
      .redirects(0)

    response.assertHeader('location', '/invoices')
    assert.lengthOf(await creditNotesOf(invoice), 0)
  })

  test('un mécanicien ne peut pas émettre d’avoir', async ({ client, assert }) => {
    const admin = await createEnterpriseAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)
    const invoice = await issuedInvoice(admin.organizationId!)

    const response = await client
      .post(`/invoices/${invoice.id}/credit-notes`)
      .loginAs(mechanic)
      .header('Accept', 'application/json')
      .json({ reason: 'x' })

    response.assertStatus(403)
    assert.lengthOf(await creditNotesOf(invoice), 0)
  })

  test('sans le module Facturation, l’émission est refusée', async ({ client, assert }) => {
    const user = await createProPlanUser()
    const invoice = await issuedInvoice(user.organizationId!)

    await client
      .post(`/invoices/${invoice.id}/credit-notes`)
      .loginAs(user)
      .json({ reason: 'x' })
      .redirects(0)

    assert.lengthOf(await creditNotesOf(invoice), 0)
  })
})

test.group('Avoirs — pièce liée', (group) => {
  group.each.setup(() => truncateDb())

  test('l’écran d’émission rend invoices/credit_note', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await issuedInvoice(user.organizationId!)

    assertPageContract(
      assert,
      await client.get(`/invoices/${invoice.id}/credit-note`).loginAs(user).withInertia(),
      'invoices/credit_note'
    )
  })

  test('la fiche facture liste ses avoirs et le reste à régler', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await issuedInvoice(user.organizationId!)
    await client
      .post(`/invoices/${invoice.id}/credit-notes`)
      .loginAs(user)
      .json({ reason: 'Remise', lines: [{ label: 'Remise', quantity: 1, unitPrice: 20 }] })
      .redirects(0)

    const response = await client.get(`/invoices/${invoice.id}`).loginAs(user).withInertia()
    const detail = response.inertiaProps.invoice as Record<string, unknown>
    assert.equal(detail.creditedTotal, 24)
    assert.equal(detail.balanceDue, 96)
    assert.deepInclude((detail.creditNotes as unknown[])[0] as object, {
      number: 'AV-000001',
      total: 24,
    })

    const [note] = await creditNotesOf(invoice)
    const noteResponse = await client.get(`/invoices/${note.id}`).loginAs(user).withInertia()
    const noteDetail = noteResponse.inertiaProps.invoice as Record<string, unknown>
    assert.equal(noteDetail.kind, 'credit_note')
    assert.deepEqual(noteDetail.creditedInvoice, { id: invoice.id, number: invoice.number })
  })

  test('un avoir est figé : ni édition, ni suppression', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await issuedInvoice(user.organizationId!)
    await client
      .post(`/invoices/${invoice.id}/credit-notes`)
      .loginAs(user)
      .json({ reason: 'Annulation' })
      .redirects(0)
    const [note] = await creditNotesOf(invoice)

    const edit = await client.get(`/invoices/${note.id}/edit`).loginAs(user).redirects(0)
    edit.assertHeader('location', `/invoices/${note.id}`)

    for (const target of [note, invoice]) {
      const response = await client.delete(`/invoices/${target.id}`).loginAs(user).redirects(0)
      response.assertFlashMessage(
        'error',
        'A credit note, or an invoice carrying credit notes, cannot be deleted.'
      )
      assert.isNotNull(await Invoice.find(target.id))
    }
  })

  test('le remboursement se saisit sur l’avoir par la route de paiement', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await issuedInvoice(user.organizationId!, 'paid')
    await client
      .post(`/invoices/${invoice.id}/credit-notes`)
      .loginAs(user)
      .json({ reason: 'Annulation' })
      .redirects(0)
    const [note] = await creditNotesOf(invoice)

    await client
      .patch(`/invoices/${note.id}/payment`)
      .loginAs(user)
      .form({ paidAt: '2026-08-12', paymentMethod: 'transfer' })
      .redirects(0)

    const refunded = await Invoice.findOrFail(note.id)
    assert.equal(refunded.status, 'paid')
    assert.equal(refunded.paymentMethod, 'transfer')

    // La facture entièrement avoirée, elle, n'encaisse plus rien.
    const response = await client
      .patch(`/invoices/${invoice.id}/payment`)
      .loginAs(user)
      .form({ paidAt: '' })
      .redirects(0)
    response.assertFlashMessage('error', "This document's payment cannot be edited.")
  })

  test('le PDF d’un avoir se génère', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await issuedInvoice(user.organizationId!)
    await client
      .post(`/invoices/${invoice.id}/credit-notes`)
      .loginAs(user)
      .json({ reason: 'Annulation' })
      .redirects(0)
    const [note] = await creditNotesOf(invoice)

    const response = await client.get(`/invoices/${note.id}/pdf`).loginAs(user)
    response.assertStatus(200)
    response.assertHeader('content-type', 'application/pdf')
    assert.include(response.header('content-disposition'), 'AV-000001.pdf')
  })
})

test.group('Avoirs — tableau de bord', (group) => {
  group.each.setup(() => truncateDb())

  test('l’encours et l’encaissé du mois sont nets des avoirs', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const open = await issuedInvoice(user.organizationId!)
    const paid = await issuedInvoice(user.organizationId!, 'paid')

    await client
      .post(`/invoices/${open.id}/credit-notes`)
      .loginAs(user)
      .json({ reason: 'Remise', lines: [{ label: 'Remise', quantity: 1, unitPrice: 20 }] })
      .redirects(0)
    await client
      .post(`/invoices/${paid.id}/credit-notes`)
      .loginAs(user)
      .json({ reason: 'Geste', lines: [{ label: 'Geste', quantity: 1, unitPrice: 10 }] })
      .redirects(0)
    const [refund] = await creditNotesOf(paid)
    await client
      .patch(`/invoices/${refund.id}/payment`)
      .loginAs(user)
      .form({ paidAt: DateTime.now().toISODate(), paymentMethod: 'transfer' })
      .redirects(0)

    await user.load('organization')
    const service = await app.container.make(InvoiceService)
    const summary = await service.getDashboardSummary(user.organization)

    assert.equal(summary.outstandingTotal, 96)
    assert.equal(summary.outstandingCount, 1)
    assert.equal(summary.paidThisMonthTotal, 108)
  })
})
