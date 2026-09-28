import { test } from '@japa/runner'
import {
  FEC_COLUMNS,
  buildFecLines,
  encodeLatin9,
  fecFilename,
  formatFecAmount,
  renderFec,
  type FecDocument,
} from '#services/fec_service'
import type { FecLine } from '#shared/types/export'

/**
 * Générateur du FEC (#879). Le fichier va chez un comptable, parfois chez
 * l'administration : une écriture déséquilibrée ou une colonne en trop le
 * rend inexploitable, et rien ne le signalerait avant.
 */

const ACCOUNTS = { sales: '706', vat: '44571', customers: '411', bank: '512' }

/** Libellés traduits : la clé et ses paramètres, lisibles dans les assertions. */
function t(key: string, params?: Record<string, string>): string {
  if (!params) return key
  return `${key}(${Object.values(params).join(',')})`
}

function doc(overrides: Partial<FecDocument>): FecDocument {
  return {
    id: 1,
    kind: 'invoice',
    number: 'FAC-000001',
    issuedAt: '2026-03-10',
    paidAt: null,
    clientId: 42,
    clientName: 'Alice Martin',
    subtotalCents: 10000,
    taxCents: 2000,
    totalCents: 12000,
    currency: 'EUR',
    creditedInvoiceId: null,
    ...overrides,
  }
}

function build(documents: FecDocument[], year = 2026) {
  return buildFecLines(documents, { year, accounts: ACCOUNTS, t })
}

/** Σ débit = Σ crédit pour chaque écriture. */
function assertBalanced(
  assert: { equal: (a: unknown, b: unknown, m?: string) => void },
  lines: FecLine[]
) {
  const byEntry = new Map<string, number>()
  for (const line of lines) {
    byEntry.set(
      line.ecritureNum,
      (byEntry.get(line.ecritureNum) ?? 0) + line.debitCents - line.creditCents
    )
  }
  for (const [num, balance] of byEntry) assert.equal(balance, 0, `écriture ${num} déséquilibrée`)
}

test.group('FEC — écritures', () => {
  test('a sent invoice: debit customers, credit sales and VAT', ({ assert }) => {
    const lines = build([doc({})])

    assert.deepEqual(
      lines.map((l) => [l.journalCode, l.compteNum, l.debitCents, l.creditCents]),
      [
        ['VE', '411', 12000, 0],
        ['VE', '706', 0, 10000],
        ['VE', '44571', 0, 2000],
      ]
    )
    assert.equal(lines[0].compAuxNum, 'C000042')
    assert.equal(lines[0].compAuxLib, 'Alice Martin')
    // Le compte auxiliaire ne porte que sur le compte client.
    assert.equal(lines[1].compAuxNum, '')
    assert.equal(lines[0].ecritureNum, 'VE000001')
    assert.equal(lines[0].ecritureDate, '20260310')
    assert.equal(lines[0].pieceRef, 'FAC-000001')
    assert.equal(lines[0].ecritureLib, 'csv.fec.labels.invoice(FAC-000001,Alice Martin)')
    assertBalanced(assert, lines)
  })

  test('an invoice without VAT has no VAT line', ({ assert }) => {
    const lines = build([doc({ subtotalCents: 5000, taxCents: 0, totalCents: 5000 })])
    assert.deepEqual(
      lines.map((l) => l.compteNum),
      ['411', '706']
    )
  })

  test('a credit note is the reverse entry', ({ assert }) => {
    const lines = build([
      doc({
        id: 2,
        kind: 'credit_note',
        number: 'AV-000001',
        creditedInvoiceId: 1,
        subtotalCents: 5000,
        taxCents: 1000,
        totalCents: 6000,
      }),
    ])
    assert.deepEqual(
      lines.map((l) => [l.compteNum, l.debitCents, l.creditCents]),
      [
        ['411', 0, 6000],
        ['706', 5000, 0],
        ['44571', 1000, 0],
      ]
    )
    assertBalanced(assert, lines)
  })

  test('the payment settles the total minus unrefunded credit notes', ({ assert }) => {
    const lines = build([
      doc({ paidAt: '2026-04-02' }),
      doc({
        id: 2,
        kind: 'credit_note',
        number: 'AV-000001',
        issuedAt: '2026-03-20',
        creditedInvoiceId: 1,
        subtotalCents: 2500,
        taxCents: 500,
        totalCents: 3000,
      }),
    ])

    const bank = lines.filter((l) => l.journalCode === 'BQ')
    assert.deepEqual(
      bank.map((l) => [l.compteNum, l.debitCents, l.creditCents, l.ecritureDate]),
      [
        ['512', 9000, 0, '20260402'],
        ['411', 0, 9000, '20260402'],
      ]
    )
    // La créance client est soldée : 120 facturés − 30 avoirés − 90 réglés.
    const customer = lines
      .filter((l) => l.compteNum === '411')
      .reduce((sum, l) => sum + l.debitCents - l.creditCents, 0)
    assert.equal(customer, 0)
    assertBalanced(assert, lines)
  })

  test('a refunded credit note produces a bank refund, not a reduced payment', ({ assert }) => {
    const lines = build([
      doc({ paidAt: '2026-03-12' }),
      doc({
        id: 2,
        kind: 'credit_note',
        number: 'AV-000001',
        issuedAt: '2026-03-20',
        paidAt: '2026-03-25',
        creditedInvoiceId: 1,
        subtotalCents: 2500,
        taxCents: 500,
        totalCents: 3000,
      }),
    ])

    const bank = lines.filter((l) => l.journalCode === 'BQ')
    assert.deepEqual(
      bank.map((l) => [l.ecritureNum, l.compteNum, l.debitCents, l.creditCents]),
      [
        ['BQ000001', '512', 12000, 0],
        ['BQ000001', '411', 0, 12000],
        ['BQ000002', '512', 0, 3000],
        ['BQ000002', '411', 3000, 0],
      ]
    )
    assertBalanced(assert, lines)
  })

  test('only entries dated in the fiscal year are kept', ({ assert }) => {
    // Facture émise en 2025, réglée en 2026 : seul le règlement est de 2026.
    const lines = build([doc({ issuedAt: '2025-12-20', paidAt: '2026-01-05' })])
    assert.deepEqual(
      lines.map((l) => l.journalCode),
      ['BQ', 'BQ']
    )
    assert.equal(lines[0].pieceDate, '20251220')
    assert.lengthOf(build([doc({ issuedAt: '2025-12-20' })]), 0)
  })

  test('entries are numbered per journal in chronological order', ({ assert }) => {
    const lines = build([
      doc({ id: 3, number: 'FAC-000003', issuedAt: '2026-05-01' }),
      doc({ id: 1, number: 'FAC-000001', issuedAt: '2026-02-01', paidAt: '2026-02-10' }),
    ])
    const entries = [...new Set(lines.map((l) => `${l.ecritureNum}:${l.pieceRef}`))]
    assert.deepEqual(entries, ['VE000001:FAC-000001', 'BQ000001:FAC-000001', 'VE000002:FAC-000003'])
  })

  test('the accounts come from the organization settings', ({ assert }) => {
    const lines = buildFecLines([doc({})], {
      year: 2026,
      accounts: { sales: '706100', vat: '445712', customers: '411000', bank: '512100' },
      t,
    })
    assert.deepEqual(
      lines.map((l) => l.compteNum),
      ['411000', '706100', '445712']
    )
  })

  test('a foreign currency fills Montantdevise and Idevise', ({ assert }) => {
    const [line] = build([doc({ currency: 'USD' })])
    assert.equal(line.currency, 'USD')
    assert.equal(line.currencyAmountCents, 12000)
    const [euro] = build([doc({})])
    assert.equal(euro.currency, '')
    assert.isNull(euro.currencyAmountCents)
  })

  test('a document without CRM client goes to a generic auxiliary account', ({ assert }) => {
    const [line] = build([doc({ clientId: null, clientName: 'Passant' })])
    assert.equal(line.compAuxNum, 'DIVERS')
    assert.equal(line.compAuxLib, 'Passant')
  })
})

test.group('FEC — fichier', () => {
  test('amounts use a decimal comma and no thousands separator', ({ assert }) => {
    assert.equal(formatFecAmount(123456), '1234,56')
    assert.equal(formatFecAmount(5), '0,05')
    assert.equal(formatFecAmount(0), '0,00')
    assert.equal(formatFecAmount(-1050), '-10,50')
  })

  test('the file has the 18 DGFiP columns, tab-separated, in ISO-8859-15', ({ assert }) => {
    const buffer = renderFec(build([doc({ clientName: 'Chloé\tDupont €' })]))
    const text = buffer.toString('latin1')
    const [header, first] = text.split('\r\n')

    assert.equal(header, FEC_COLUMNS.join('\t'))
    assert.lengthOf(header.split('\t'), 18)
    assert.lengthOf(first.split('\t'), 18)
    assert.isTrue(text.endsWith('\r\n'))
    // La tabulation du nom est neutralisée ; l'euro est à sa place Latin-9.
    assert.include(first, 'Chloé Dupont')
    assert.include([...buffer], 0xa4)
    assert.equal(first.split('\t')[11], '120,00')
  })

  test('characters outside Latin-9 become a question mark', ({ assert }) => {
    assert.deepEqual([...encodeLatin9('é€Œ✓')], [0xe9, 0xa4, 0xbc, 0x3f])
  })

  test('the file name carries the SIREN and the closing date', ({ assert }) => {
    assert.equal(fecFilename('123456789', 2026), '123456789FEC20261231.txt')
    assert.equal(fecFilename(null, 2026), 'FEC20261231.txt')
  })
})
