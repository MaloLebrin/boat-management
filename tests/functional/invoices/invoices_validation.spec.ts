import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { createEnterpriseAdminUser } from '#tests/functional/helpers'
import { assertFieldErrors, assertNoFieldErrors } from '#tests/support/validation'
import Invoice from '#models/invoice'
import type { ApiClient } from '@japa/api-client'

/**
 * Chemins d'erreur de `createInvoiceValidator` (#688).
 *
 * Seul formulaire du produit à valider un **tableau imbriqué** : les erreurs y
 * sont indexées (`lines.0.quantity`), et c'est cette forme de clé que le
 * composant de lignes doit savoir relire pour souligner la bonne ligne. La
 * figer ici, c'est empêcher qu'un changement de schéma déplace silencieusement
 * l'erreur hors de portée de l'UI.
 */

/** Payload valide, en clés de formulaire crochetées pour le tableau `lines`. */
function invoiceForm(overrides: Record<string, unknown> = {}) {
  return {
    'kind': 'invoice',
    'issuedAt': '2026-07-05',
    'taxRate': 20,
    'lines[0][label]': 'Location semaine',
    'lines[0][quantity]': 2,
    'lines[0][unitPrice]': 100,
    ...overrides,
  }
}

test.group('Invoices validation (functional)', (group) => {
  group.each.setup(() => truncateDb())

  async function post(client: ApiClient, overrides: Record<string, unknown> = {}) {
    const user = await createEnterpriseAdminUser()

    return client.post('/invoices').form(invoiceForm(overrides)).loginAs(user).redirects(0)
  }

  // --- le témoin ---

  test('the reference payload passes the validator and creates the invoice', async ({
    client,
    assert,
  }) => {
    const response = await post(client)

    assertNoFieldErrors(assert, response)
    assert.lengthOf(await Invoice.all(), 1)
  })

  // --- l'objet racine ---

  test('rejects a kind outside quote/invoice', async ({ client, assert }) => {
    assertFieldErrors(assert, await post(client, { kind: 'receipt' }), ['kind'])
  })

  test('rejects a taxRate above 100', async ({ client, assert }) => {
    assertFieldErrors(assert, await post(client, { taxRate: 150 }), ['taxRate'])
  })

  test('rejects a negative taxRate', async ({ client, assert }) => {
    assertFieldErrors(assert, await post(client, { taxRate: -1 }), ['taxRate'])
  })

  test('rejects a malformed issuedAt', async ({ client, assert }) => {
    // Un seul format accepté : `YYYY-MM-DD`, celui de l'`<input type="date">`.
    assertFieldErrors(assert, await post(client, { issuedAt: '05/07/2026' }), ['issuedAt'])
  })

  test('rejects a currency that is not a three-letter code', async ({ client, assert }) => {
    assertFieldErrors(assert, await post(client, { currency: 'EURO' }), ['currency'])
  })

  // --- les lignes ---

  test('rejects an invoice without a single line', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const response = await client
      .post('/invoices')
      .form({ kind: 'invoice', issuedAt: '2026-07-05', taxRate: 20 })
      .loginAs(user)
      .redirects(0)

    assertFieldErrors(assert, response, ['lines'])
  })

  test('rejects a line with an empty label, on the indexed key', async ({ client, assert }) => {
    assertFieldErrors(assert, await post(client, { 'lines[0][label]': '' }), ['lines.0.label'])
  })

  test('rejects a negative quantity, on the indexed key', async ({ client, assert }) => {
    assertFieldErrors(assert, await post(client, { 'lines[0][quantity]': -2 }), [
      'lines.0.quantity',
    ])
  })

  test('rejects a zero quantity', async ({ client, assert }) => {
    // `.positive()` : facturer zéro unité n'a pas de sens, et le total serait nul.
    assertFieldErrors(assert, await post(client, { 'lines[0][quantity]': 0 }), ['lines.0.quantity'])
  })

  test('rejects a negative unitPrice', async ({ client, assert }) => {
    // Un prix négatif serait une remise déguisée, hors du modèle de facture.
    assertFieldErrors(assert, await post(client, { 'lines[0][unitPrice]': -10 }), [
      'lines.0.unitPrice',
    ])
  })
})
