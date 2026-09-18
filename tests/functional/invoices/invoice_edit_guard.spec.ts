import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { InvoiceFactory } from '#database/factories/invoice_factory'
import { InvoiceLineFactory } from '#database/factories/invoice_line_factory'
import Invoice from '#models/invoice'
import InvoiceLine from '#models/invoice_line'
import { createEnterpriseAdminUser } from '#tests/functional/helpers'
import { assertPageContract } from '#tests/support/inertia_page'

/**
 * Ce que `GET /invoices/:id/edit` laisse passer (#694).
 *
 * L'issue annonçait la route « jamais atteinte » : elle l'est depuis #689,
 * `invoices_pages_contract.spec.ts` épingle son composant et ses props. Restaient
 * deux faces jamais éprouvées — la facture d'une autre organisation, et la
 * facture déjà payée — et la première dément l'issue : ce n'est pas un 404.
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

test.group('Factures — une facture payée reste entièrement modifiable', (group) => {
  group.each.setup(() => truncateDb())

  /**
   * ⚠️ **Constat, pas validation.** Ni le contrôleur, ni `InvoiceService.update`,
   * ni le validateur n'opposent de garde de statut : une facture `paid` se
   * réécrit, montants compris, et son statut peut même redescendre à `draft`.
   * Le seul garde-fou du domaine joue dans l'autre sens — `markAsPaid` refuse
   * une facture déjà payée (`CannotMarkPaidError`).
   *
   * Figé ici pour que le durcissement soit un choix visible, et suivi par
   * l'issue #717.
   */

  test("l'écran d'édition s'ouvre sur une facture payée", async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await InvoiceFactory.merge({ organizationId: user.organizationId! })
      .apply('invoice')
      .apply('paid')
      .create()

    const response = await client.get(`/invoices/${invoice.id}/edit`).loginAs(user).withInertia()

    assertPageContract(assert, response, 'invoices/form')
    const props = response.inertiaProps as { invoice: { id: number; status: string } }
    assert.equal(props.invoice.id, invoice.id)
    assert.equal(props.invoice.status, 'paid')
  })

  test('… et son total se réécrit', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await InvoiceFactory.merge({ organizationId: user.organizationId! })
      .apply('invoice')
      .apply('paid')
      .create()
    await InvoiceLineFactory.merge({ invoiceId: invoice.id }).create()

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

    const updated = await Invoice.findOrFail(invoice.id)
    assert.equal(Number(updated.total), 12)
    assert.equal(Number(updated.subtotal), 10)

    const lines = await InvoiceLine.query().where('invoiceId', invoice.id)
    assert.lengthOf(lines, 1)
    assert.equal(lines[0].label, 'Location semaine (révisée)')
  })

  test('… jusqu’à repasser en brouillon en gardant sa date de paiement', async ({
    client,
    assert,
  }) => {
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

    assert.equal(updated.status, 'draft')
    // `update` ne touche jamais `paidAt` : la ligne devient incohérente — un
    // brouillon qui porte une date de paiement. C'est le cœur de l'issue de
    // suivi.
    assert.isNotNull(updated.paidAt)
  })

  test('le numéro et la nature, eux, ne bougent pas', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await InvoiceFactory.merge({ organizationId: user.organizationId! })
      .apply('invoice')
      .apply('paid')
      .create()

    await client
      .put(`/invoices/${invoice.id}`)
      .loginAs(user)
      .form(updateForm({ kind: 'quote' }))
      .redirects(0)

    const updated = await Invoice.findOrFail(invoice.id)

    // Le seul invariant que le service protège vraiment : le numéro et la
    // nature d'une pièce comptable sont figés à la création.
    assert.equal(updated.number, invoice.number)
    assert.equal(updated.kind, 'invoice')
  })
})
