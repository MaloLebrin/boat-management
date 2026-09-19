import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { InvoiceFactory } from '#database/factories/invoice_factory'
import { InvoiceLineFactory } from '#database/factories/invoice_line_factory'
import Invoice from '#models/invoice'
import InvoiceLine from '#models/invoice_line'
import { createEnterpriseAdminUser } from '#tests/functional/helpers'
import { assertPageContract } from '#tests/support/inertia_page'

/**
 * Ce que `GET /invoices/:id/edit` et `PUT /invoices/:id` laissent passer.
 *
 * Deux faces jamais éprouvées avant #694 : la facture d'une autre organisation,
 * et la facture déjà émise. La première dément l'issue d'origine — ce n'est pas
 * un 404 mais une redirection.
 *
 * La seconde était un **constat** (#694) : une facture `paid` se réécrivait
 * intégralement, statut et montants compris, en gardant sa date de paiement.
 * #717 a tranché — une facture émise est figée, seuls sa date et son moyen de
 * paiement restent corrigeables. Ces tests sont désormais des **validations**.
 */

/** Payload de mise à jour valide, clés à crochets pour le tableau de lignes. */
function updateForm(overrides: Record<string, unknown> = {}) {
  return {
    'kind': 'invoice',
    'issuedAt': '2026-07-05',
    'taxRate': 20,
    'lines[0][label]': 'Location semaine',
    'lines[0][quantity]': 1,
    'lines[0][unitPrice]': 100,
    ...overrides,
  }
}

test.group("Factures — l'édition d'une facture qui n'est pas la sienne", (group) => {
  group.each.setup(() => truncateDb())

  test("une facture d'une autre organisation redirige, elle ne rend pas un 404", async ({
    client,
    assert,
  }) => {
    const owner = await createEnterpriseAdminUser()
    const invoice = await InvoiceFactory.merge({ organizationId: owner.organizationId! }).create()
    const attacker = await createEnterpriseAdminUser()

    const response = await client.get(`/invoices/${invoice.id}/edit`).loginAs(attacker).redirects(0)

    // L'isolation passe par `getForOrganizationOrFail`, pas par la policy
    // (`InvoicePolicy.update` ne prend aucune ressource) : l'absence se traduit
    // donc en redirection vers la liste, avec un flash. Seul un `:id` non
    // numérique produirait un vrai 404, via le matcher global de route.
    response.assertStatus(302)
    response.assertHeader('location', '/invoices')
    response.assertFlashMessage('error', 'Invoice not found.')
    assert.lengthOf(await Invoice.all(), 1)
  })
})

test.group('Factures — une facture émise est figée', (group) => {
  group.each.setup(() => truncateDb())

  test("l'écran d'édition d'une facture payée redirige vers sa fiche", async ({ client }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await InvoiceFactory.merge({ organizationId: user.organizationId! })
      .apply('invoice')
      .apply('paid')
      .create()

    const response = await client.get(`/invoices/${invoice.id}/edit`).loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/invoices/${invoice.id}`)
    response.assertFlashMessage(
      'error',
      'This invoice has been issued: it can no longer be edited. Only its payment can be corrected.'
    )
  })

  test("une facture seulement envoyée est déjà émise : elle non plus ne s'édite", async ({
    client,
  }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await InvoiceFactory.merge({ organizationId: user.organizationId! })
      .apply('invoice')
      .apply('sent')
      .create()

    const response = await client.get(`/invoices/${invoice.id}/edit`).loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/invoices/${invoice.id}`)
  })

  test('… et son total ne se réécrit plus', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await InvoiceFactory.merge({ organizationId: user.organizationId! })
      .apply('invoice')
      .apply('paid')
      .create()
    await InvoiceLineFactory.merge({ invoiceId: invoice.id, label: 'Location semaine' }).create()

    const response = await client
      .put(`/invoices/${invoice.id}`)
      .loginAs(user)
      .form(
        updateForm({
          'lines[0][label]': 'Location semaine (révisée)',
          'lines[0][unitPrice]': 10,
        })
      )
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/invoices/${invoice.id}`)

    const updated = await Invoice.findOrFail(invoice.id)
    assert.equal(Number(updated.total), 120)
    assert.equal(Number(updated.subtotal), 100)

    // Les lignes ne sont ni supprimées ni recréées.
    const lines = await InvoiceLine.query().where('invoiceId', invoice.id)
    assert.lengthOf(lines, 1)
    assert.equal(lines[0].label, 'Location semaine')
  })

  test('… ni son statut, qui ne redescend plus en brouillon', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await InvoiceFactory.merge({ organizationId: user.organizationId! })
      .apply('invoice')
      .apply('paid')
      .create()

    assert.isNotNull(invoice.paidAt)

    await client
      .put(`/invoices/${invoice.id}`)
      .loginAs(user)
      .form(updateForm({ status: 'draft' }))
      .redirects(0)

    const updated = await Invoice.findOrFail(invoice.id)

    assert.equal(updated.status, 'paid')
    assert.isNotNull(updated.paidAt)
  })

  test('un devis, lui, reste librement modifiable quel que soit son statut', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const quote = await InvoiceFactory.merge({ organizationId: user.organizationId! })
      .apply('sent')
      .create()
    await InvoiceLineFactory.merge({ invoiceId: quote.id }).create()

    const response = await client
      .put(`/invoices/${quote.id}`)
      .loginAs(user)
      .form(updateForm({ 'kind': 'quote', 'lines[0][unitPrice]': 10 }))
      .redirects(0)

    response.assertStatus(302)
    const updated = await Invoice.findOrFail(quote.id)
    assert.equal(Number(updated.subtotal), 10)
  })

  test("une facture encore en brouillon s'édite, et sa date de paiement suit son statut", async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await InvoiceFactory.merge({ organizationId: user.organizationId! })
      .apply('invoice')
      .create()
    await InvoiceLineFactory.merge({ invoiceId: invoice.id }).create()

    // Un brouillon peut être ouvert à l'édition…
    const editResponse = await client
      .get(`/invoices/${invoice.id}/edit`)
      .loginAs(user)
      .withInertia()
    assertPageContract(assert, editResponse, 'invoices/form')

    // … et le formulaire qui le passe en `paid` horodate le paiement, au lieu de
    // laisser une facture payée sans date (#717).
    await client
      .put(`/invoices/${invoice.id}`)
      .loginAs(user)
      .form(updateForm({ status: 'paid' }))
      .redirects(0)

    const updated = await Invoice.findOrFail(invoice.id)
    assert.equal(updated.status, 'paid')
    assert.isNotNull(updated.paidAt)
  })

  test('le numéro et la nature, eux, ne bougent toujours pas', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await InvoiceFactory.merge({ organizationId: user.organizationId! })
      .apply('invoice')
      .create()
    await InvoiceLineFactory.merge({ invoiceId: invoice.id }).create()

    await client
      .put(`/invoices/${invoice.id}`)
      .loginAs(user)
      .form(updateForm({ kind: 'quote' }))
      .redirects(0)

    const updated = await Invoice.findOrFail(invoice.id)

    // Le numéro et la nature d'une pièce comptable sont figés à la création.
    assert.equal(updated.number, invoice.number)
    assert.equal(updated.kind, 'invoice')
  })
})
