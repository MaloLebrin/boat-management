import { test } from '@japa/runner'
import AuditLog from '#models/audit_log'
import Organization from '#models/organization'
import { truncateDb } from '#tests/utils/db'
import {
  createAdminUser,
  createEnterpriseAdminUser,
  createMechanicUser,
  createMemberUser,
} from '#tests/functional/helpers'
import { createClient, createInvoice, csvRows } from '#tests/functional/exports/helpers'

/**
 * Exports comptables (#879) : journal des ventes CSV (par pièce ou par ligne),
 * FEC, comptes du FEC dans `/settings/billing`.
 */

async function frenchAdmin() {
  const user = await createEnterpriseAdminUser()
  user.locale = 'fr'
  await user.save()
  return user
}

test.group('Exports comptables — journal des ventes', (group) => {
  group.each.setup(() => truncateDb())

  test('one row per issued document, credit notes negative, drafts and quotes left out', async ({
    client,
    assert,
  }) => {
    const user = await frenchAdmin()
    const orgId = user.organizationId!
    const invoice = await createInvoice(orgId, { number: 'FAC-000001', paidAt: '2026-03-20' })
    await createInvoice(orgId, {
      kind: 'credit_note',
      number: 'AV-000001',
      issuedAt: '2026-03-25',
      creditedInvoiceId: invoice.id,
      subtotal: '50.00',
      taxAmount: '10.00',
      total: '60.00',
    })
    await createInvoice(orgId, { number: 'FAC-000002', status: 'draft' })
    await createInvoice(orgId, { kind: 'quote', number: 'DEV-000001' })

    const response = await client.get('/invoices/export.csv').loginAs(user)

    response.assertStatus(200)
    response.assertHeader('content-type', 'text/csv; charset=utf-8')
    assert.include(response.header('content-disposition'), 'filename="sales-journal_')
    const rows = csvRows(response.text())
    assert.deepEqual(rows[0], [
      'numéro',
      'type',
      'date',
      'échéance',
      'client',
      'facture_avoirée',
      'montant_ht',
      'taux_tva',
      'montant_tva',
      'montant_ttc',
      'devise',
      'statut',
      'date_paiement',
      'moyen_paiement',
    ])
    assert.lengthOf(rows, 3)
    assert.deepEqual(rows[1].slice(0, 2), ['FAC-000001', 'Facture'])
    assert.deepEqual(rows[1].slice(6, 10), ['100.00', '20.00', '20.00', '120.00'])
    assert.deepEqual(rows[1].slice(12), ['2026-03-20', 'Virement'])
    assert.deepEqual(rows[2].slice(0, 2), ['AV-000001', 'Avoir'])
    assert.equal(rows[2][5], 'FAC-000001')
    assert.deepEqual(rows[2].slice(6, 10), ['-50.00', '20.00', '-10.00', '-60.00'])

    const audit = await AuditLog.query().where('action', 'export.run').firstOrFail()
    assert.equal(audit.userId, user.id)
    assert.deepInclude(audit.metadata!, { type: 'invoices', rowCount: 2, async: false })
  })

  test('the period, kind and status filters apply', async ({ client, assert }) => {
    const user = await frenchAdmin()
    const orgId = user.organizationId!
    await createInvoice(orgId, { number: 'FAC-000001', issuedAt: '2026-01-15' })
    await createInvoice(orgId, { number: 'FAC-000002', issuedAt: '2026-02-15', status: 'paid' })
    await createInvoice(orgId, { number: 'FAC-000003', issuedAt: '2026-03-15' })

    const period = await client
      .get('/invoices/export.csv')
      .qs({ from: '2026-02-01', to: '2026-03-31' })
      .loginAs(user)
    assert.deepEqual(
      csvRows(period.text())
        .slice(1)
        .map((row) => row[0]),
      ['FAC-000002', 'FAC-000003']
    )
    assert.include(period.header('content-disposition'), 'sales-journal_2026-02-01_2026-03-31.csv')

    const paid = await client.get('/invoices/export.csv').qs({ status: 'paid' }).loginAs(user)
    assert.deepEqual(
      csvRows(paid.text())
        .slice(1)
        .map((row) => row[0]),
      ['FAC-000002']
    )

    const credits = await client
      .get('/invoices/export.csv')
      .qs({ kind: 'credit_note' })
      .loginAs(user)
    assert.lengthOf(csvRows(credits.text()), 1)
  })

  test('the per-line variant gives one row per invoice line', async ({ client, assert }) => {
    const user = await frenchAdmin()
    await createInvoice(user.organizationId!)

    const response = await client.get('/invoices/export.csv').qs({ detail: 'lines' }).loginAs(user)

    response.assertStatus(200)
    assert.include(response.header('content-disposition'), 'sales-journal-lines_')
    const rows = csvRows(response.text())
    assert.equal(rows[0][4], 'libellé')
    assert.deepEqual(rows[1].slice(4, 8), ['Location semaine', '1.00', '100.00', '100.00'])
    const audit = await AuditLog.query().where('action', 'export.run').firstOrFail()
    assert.equal(audit.metadata!.type, 'invoice_lines')
  })

  test('a formula in a client name is neutralized (#773)', async ({ client, assert }) => {
    const user = await frenchAdmin()
    await createInvoice(user.organizationId!, { clientName: '=HYPERLINK("http://x")' })

    const response = await client.get('/invoices/export.csv').loginAs(user)
    assert.include(response.text(), `"'=HYPERLINK(""http://x"")"`)
  })

  test('another organization’s invoices never leak', async ({ client, assert }) => {
    const user = await frenchAdmin()
    const other = await createEnterpriseAdminUser()
    await createInvoice(other.organizationId!, { number: 'FAC-999999' })

    const response = await client.get('/invoices/export.csv').loginAs(user)
    assert.notInclude(response.text(), 'FAC-999999')
  })

  test('a to date before from is refused', async ({ client }) => {
    const user = await frenchAdmin()
    const response = await client
      .get('/invoices/export.csv')
      .qs({ from: '2026-03-01', to: '2026-02-01' })
      .header('Accept', 'application/json')
      .loginAs(user)
    response.assertStatus(422)
  })

  test('a plan without export is sent to the upsell', async ({ client }) => {
    const user = await createAdminUser('starter')
    const response = await client.get('/invoices/export.csv').loginAs(user).redirects(0)
    response.assertStatus(302)
    response.assertFlashMessage('errorAction', '/settings/billing')
  })

  test('a mechanic, who cannot see invoices, cannot export them', async ({ client }) => {
    const admin = await createEnterpriseAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)
    const response = await client
      .get('/invoices/export.csv')
      .header('Accept', 'application/json')
      .loginAs(mechanic)
    response.assertStatus(403)
  })

  test('a member, who can see invoices, can export them', async ({ client }) => {
    const admin = await createEnterpriseAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const response = await client.get('/invoices/export.csv').loginAs(member)
    response.assertStatus(200)
  })
})

test.group('Exports comptables — FEC', (group) => {
  group.each.setup(() => truncateDb())

  test('the FEC of a year: DGFiP columns, balanced entries, SIREN file name', async ({
    client,
    assert,
  }) => {
    const user = await frenchAdmin()
    const orgId = user.organizationId!
    await Organization.query().where('id', orgId).update({ accountingSiren: '123456789' })
    const alice = await createClient(orgId)
    await createInvoice(orgId, { clientId: alice.id, paidAt: '2026-03-20' })
    await createInvoice(orgId, { number: 'FAC-000002', issuedAt: '2025-06-01' })

    const response = await client.get('/invoices/export/fec').qs({ year: 2026 }).loginAs(user)

    response.assertStatus(200)
    response.assertHeader('content-type', 'text/plain; charset=iso-8859-15')
    assert.include(response.header('content-disposition'), 'filename="123456789FEC20261231.txt"')

    // Les colonnes vérifiées sont en ASCII : le décodage UTF-8 du client de
    // test ne gêne pas (le fichier est en ISO-8859-15).
    const lines = response
      .text()
      .trimEnd()
      .split('\r\n')
      .map((line) => line.split('\t'))
    assert.equal(lines[0][0], 'JournalCode')
    assert.lengthOf(lines[0], 18)
    // 3 lignes de vente + 2 de banque ; la facture de 2025 n'y est pas.
    assert.lengthOf(lines, 6)
    assert.deepEqual(
      lines.slice(1).map((l) => [l[0], l[4], l[11], l[12]]),
      [
        ['VE', '411', '120,00', '0,00'],
        ['VE', '706', '0,00', '100,00'],
        ['VE', '44571', '0,00', '20,00'],
        ['BQ', '512', '120,00', '0,00'],
        ['BQ', '411', '0,00', '120,00'],
      ]
    )
    assert.equal(lines[1][6], `C${String(alice.id).padStart(6, '0')}`)

    const audit = await AuditLog.query().where('action', 'export.run').firstOrFail()
    assert.deepInclude(audit.metadata!, {
      type: 'fec',
      from: '2026-01-01',
      to: '2026-12-31',
      rowCount: 5,
    })
  })

  test('the year is required', async ({ client }) => {
    const user = await frenchAdmin()
    const response = await client
      .get('/invoices/export/fec')
      .header('Accept', 'application/json')
      .loginAs(user)
    response.assertStatus(422)
  })

  test('the accounts set in the billing settings are used', async ({ client, assert }) => {
    const user = await frenchAdmin()
    await createInvoice(user.organizationId!)

    const saved = await client
      .put('/settings/billing/accounting')
      .loginAs(user)
      .json({
        siren: '987654321',
        salesAccount: '706100',
        vatAccount: '445712',
        customerAccount: '411000',
        bankAccount: '512100',
      })
      .redirects(0)
    saved.assertHeader('location', '/settings/billing')
    saved.assertFlashMessage('success', 'Réglages de l’export comptable enregistrés.')

    const response = await client.get('/invoices/export/fec').qs({ year: 2026 }).loginAs(user)
    assert.include(response.header('content-disposition'), '987654321FEC20261231.txt')
    const accounts = response
      .text()
      .trimEnd()
      .split('\r\n')
      .slice(1)
      .map((line) => line.split('\t')[4])
    assert.deepEqual(accounts, ['411000', '706100', '445712'])
    assert.lengthOf(await AuditLog.query().where('action', 'accounting_settings.update'), 1)
  })
})

test.group('Exports comptables — réglages', (group) => {
  group.each.setup(() => truncateDb())

  test('the billing page carries the accounting settings with their defaults', async ({
    client,
    assert,
  }) => {
    const user = await frenchAdmin()
    const page = await client.get('/settings/billing').loginAs(user).withInertia()
    assert.deepEqual(page.inertiaProps.accounting, {
      siren: null,
      accounts: { sales: '706', vat: '44571', customers: '411', bank: '512' },
      canManage: true,
    })
  })

  test('an invalid SIREN or account is refused', async ({ client, assert }) => {
    const user = await frenchAdmin()
    await client
      .put('/settings/billing/accounting')
      .loginAs(user)
      .header('referer', '/settings/billing')
      .form({
        siren: '12345',
        salesAccount: '706',
        vatAccount: 'TVA',
        customerAccount: '411',
        bankAccount: '512',
      })
      .redirects(0)

    const org = await Organization.findOrFail(user.organizationId)
    assert.isNull(org.accountingSiren)
    assert.equal(org.accountingVatAccount, '44571')
  })

  test('a member cannot change them', async ({ client, assert }) => {
    const admin = await frenchAdmin()
    const member = await createMemberUser(admin.organizationId!)
    const response = await client
      .put('/settings/billing/accounting')
      .loginAs(member)
      .header('Accept', 'application/json')
      .json({
        siren: null,
        salesAccount: '707',
        vatAccount: '44571',
        customerAccount: '411',
        bankAccount: '512',
      })
    response.assertStatus(403)
    const org = await Organization.findOrFail(admin.organizationId)
    assert.equal(org.accountingSalesAccount, '706')
  })
})
