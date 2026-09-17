import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import Invoice from '#models/invoice'
import { createEnterpriseAdminUser } from '#tests/functional/helpers'
import { assertPageContract } from '#tests/support/inertia_page'
import { DateTime } from 'luxon'

/**
 * Contrat des pages de facturation (#689).
 *
 * `invoices/form` est rendue depuis **deux** endroits du contrôleur — création
 * (`invoice: null`) et édition. Épingler le composant ne distingue pas les deux
 * variantes : on couvre donc les deux chemins explicitement.
 */

async function createInvoice(organizationId: number) {
  return Invoice.create({
    organizationId,
    kind: 'invoice',
    number: 'INV-0001',
    status: 'draft',
    issuedAt: DateTime.fromISO('2026-07-05'),
    taxRate: '20',
    currency: 'EUR',
    subtotal: '100',
    taxAmount: '20',
    total: '120',
  })
}

test.group('Invoices pages contract (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('GET /invoices renders invoices/index', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    assertPageContract(
      assert,
      await client.get('/invoices').loginAs(user).withInertia(),
      'invoices/index'
    )
  })

  test('GET /invoices/new renders invoices/form for a creation', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    assertPageContract(
      assert,
      await client.get('/invoices/new').loginAs(user).withInertia(),
      'invoices/form'
    )
  })

  test('GET /invoices/:id renders invoices/show', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await createInvoice(user.organizationId!)

    assertPageContract(
      assert,
      await client.get(`/invoices/${invoice.id}`).loginAs(user).withInertia(),
      'invoices/show'
    )
  })

  test('GET /invoices/:id/edit renders invoices/form for an edition', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await createInvoice(user.organizationId!)

    assertPageContract(
      assert,
      await client.get(`/invoices/${invoice.id}/edit`).loginAs(user).withInertia(),
      'invoices/form'
    )
  })
})
