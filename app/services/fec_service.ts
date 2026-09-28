import Invoice from '#models/invoice'
import type Organization from '#models/organization'
import { FEC_JOURNALS } from '#shared/constants/exports'
import type { AccountingAccountKey, ExportFile, FecLine } from '#shared/types/export'
import { inject } from '@adonisjs/core'
import type { I18n } from '@adonisjs/i18n'
import { DateTime } from 'luxon'

/**
 * Fichier des écritures comptables (#879) — format de l'article A47 A-1 du
 * LPF : 18 colonnes séparées par une tabulation, dates `AAAAMMJJ`, montants à
 * virgule décimale, encodage ISO-8859-15.
 *
 * C'est une **aide** au comptable, pas un livre comptable certifié : les
 * écritures sont reconstituées depuis les factures, les avoirs et leurs
 * paiements, sans clôture ni validation.
 *
 * - Journal des ventes (`VE`), à la date d'émission : facture = débit 411
 *   (TTC, compte auxiliaire du client), crédit 706 (HT), crédit 44571 (TVA) ;
 *   avoir = l'écriture inverse.
 * - Journal de banque (`BQ`), à la date de paiement : règlement d'une facture
 *   = débit 512, crédit 411, pour le total **moins les avoirs non remboursés**
 *   (ils ont réduit ce que le client devait) ; remboursement d'un avoir =
 *   débit 411, crédit 512.
 * - Une facture annulée (`cancelled`, statut antérieur aux avoirs) n'est pas
 *   reprise : une pièce émise se corrige par avoir (#877).
 */

export const FEC_COLUMNS = [
  'JournalCode',
  'JournalLib',
  'EcritureNum',
  'EcritureDate',
  'CompteNum',
  'CompteLib',
  'CompAuxNum',
  'CompAuxLib',
  'PieceRef',
  'PieceDate',
  'EcritureLib',
  'Debit',
  'Credit',
  'EcritureLet',
  'DateLet',
  'ValidDate',
  'Montantdevise',
  'Idevise',
] as const

const FEC_DOCUMENT_COLUMNS = [
  'id',
  'kind',
  'number',
  'issuedAt',
  'paidAt',
  'clientId',
  'clientName',
  'subtotal',
  'taxAmount',
  'total',
  'currency',
  'creditedInvoiceId',
]

/** Statuts d'une facture reprise au FEC. */
const FEC_INVOICE_STATUSES = ['sent', 'paid', 'overdue', 'credited'] as const

/** Pièce (facture ou avoir) telle que le FEC la lit. Montants en centimes. */
export interface FecDocument {
  id: number
  kind: 'invoice' | 'credit_note'
  number: string
  issuedAt: string
  paidAt: string | null
  clientId: number | null
  clientName: string | null
  subtotalCents: number
  taxCents: number
  totalCents: number
  currency: string
  /** Avoir : facture qu'il corrige. */
  creditedInvoiceId: number | null
}

export interface FecBuildOptions {
  year: number
  accounts: Record<AccountingAccountKey, string>
  t: (key: string, params?: Record<string, string>) => string
}

export function toCents(amount: string | number | null): number {
  if (amount === null) return 0
  const value = typeof amount === 'number' ? amount : Number.parseFloat(amount)
  return Number.isFinite(value) ? Math.round(value * 100) : 0
}

/** `123456` → `1234,56` : virgule décimale, pas de séparateur de milliers. */
export function formatFecAmount(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`
}

/** `2026-03-14` → `20260314`. */
export function formatFecDate(isoDate: string): string {
  return isoDate.slice(0, 10).replaceAll('-', '')
}

/** Une tabulation ou un saut de ligne casserait les colonnes. */
function clean(value: string): string {
  return value.replace(/[\t\r\n|]+/g, ' ').trim()
}

/**
 * ISO-8859-15 : Latin-1, sauf huit positions (dont l'euro). Un caractère hors
 * de la table devient `?` plutôt que de corrompre le fichier.
 */
const LATIN9_OVERRIDES = new Map<string, number>([
  ['€', 0xa4],
  ['Š', 0xa6],
  ['š', 0xa8],
  ['Ž', 0xb4],
  ['ž', 0xb8],
  ['Œ', 0xbc],
  ['œ', 0xbd],
  ['Ÿ', 0xbe],
])
const LATIN9_REPLACED = new Set([0xa4, 0xa6, 0xa8, 0xb4, 0xb8, 0xbc, 0xbd, 0xbe])

export function encodeLatin9(text: string): Buffer {
  const bytes: number[] = []
  for (const char of text) {
    const override = LATIN9_OVERRIDES.get(char)
    if (override !== undefined) {
      bytes.push(override)
      continue
    }
    const code = char.codePointAt(0)!
    bytes.push(code <= 0xff && !LATIN9_REPLACED.has(code) ? code : 0x3f)
  }
  return Buffer.from(bytes)
}

function customerAux(doc: FecDocument): { num: string; lib: string } {
  return {
    num: doc.clientId === null ? 'DIVERS' : `C${String(doc.clientId).padStart(6, '0')}`,
    lib: clean(doc.clientName ?? ''),
  }
}

function inYear(isoDate: string | null, year: number): isoDate is string {
  return isoDate !== null && isoDate.startsWith(`${year}-`)
}

interface PendingEntry {
  journal: keyof typeof FEC_JOURNALS
  date: string
  doc: FecDocument
  label: string
  lines: { account: AccountingAccountKey; debit: number; credit: number; aux: boolean }[]
}

/**
 * Écritures de l'exercice `year`, numérotées par journal dans l'ordre
 * chronologique. Chaque écriture est équilibrée (Σ débit = Σ crédit).
 */
export function buildFecLines(documents: FecDocument[], options: FecBuildOptions): FecLine[] {
  const { year, accounts, t } = options
  const entries: PendingEntry[] = []

  // Avoirs non remboursés, par facture : ils ont réduit la créance, le
  // règlement de la facture ne porte que le reste.
  const unrefundedCredits = new Map<number, number>()
  for (const doc of documents) {
    if (doc.kind !== 'credit_note' || doc.creditedInvoiceId === null || doc.paidAt !== null)
      continue
    unrefundedCredits.set(
      doc.creditedInvoiceId,
      (unrefundedCredits.get(doc.creditedInvoiceId) ?? 0) + doc.totalCents
    )
  }

  for (const doc of documents) {
    const isCredit = doc.kind === 'credit_note'
    const params = { number: doc.number, client: clean(doc.clientName ?? '') }

    if (inYear(doc.issuedAt, year)) {
      const lines: PendingEntry['lines'] = [
        {
          account: 'customers',
          debit: isCredit ? 0 : doc.totalCents,
          credit: isCredit ? doc.totalCents : 0,
          aux: true,
        },
        {
          account: 'sales',
          debit: isCredit ? doc.subtotalCents : 0,
          credit: isCredit ? 0 : doc.subtotalCents,
          aux: false,
        },
      ]
      if (doc.taxCents !== 0) {
        lines.push({
          account: 'vat',
          debit: isCredit ? doc.taxCents : 0,
          credit: isCredit ? 0 : doc.taxCents,
          aux: false,
        })
      }
      entries.push({
        journal: 'sales',
        date: doc.issuedAt,
        doc,
        label: t(`csv.fec.labels.${isCredit ? 'creditNote' : 'invoice'}`, params),
        lines,
      })
    }

    if (inYear(doc.paidAt, year)) {
      const amount = isCredit
        ? doc.totalCents
        : doc.totalCents - (unrefundedCredits.get(doc.id) ?? 0)
      if (amount <= 0) continue
      entries.push({
        journal: 'bank',
        date: doc.paidAt,
        doc,
        label: t(`csv.fec.labels.${isCredit ? 'refund' : 'payment'}`, params),
        lines: [
          {
            account: 'bank',
            debit: isCredit ? 0 : amount,
            credit: isCredit ? amount : 0,
            aux: false,
          },
          {
            account: 'customers',
            debit: isCredit ? amount : 0,
            credit: isCredit ? 0 : amount,
            aux: true,
          },
        ],
      })
    }
  }

  entries.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.journal.localeCompare(b.journal) ||
      a.doc.number.localeCompare(b.doc.number)
  )

  const sequences: Record<keyof typeof FEC_JOURNALS, number> = { sales: 0, bank: 0 }
  const result: FecLine[] = []
  for (const entry of entries) {
    sequences[entry.journal] += 1
    const journalCode = FEC_JOURNALS[entry.journal]
    const ecritureNum = `${journalCode}${String(sequences[entry.journal]).padStart(6, '0')}`
    const date = formatFecDate(entry.date)
    const aux = customerAux(entry.doc)
    const foreign = entry.doc.currency !== 'EUR'
    for (const line of entry.lines) {
      result.push({
        journalCode,
        journalLib: t(`csv.fec.journals.${entry.journal}`),
        ecritureNum,
        ecritureDate: date,
        compteNum: accounts[line.account],
        compteLib: t(`csv.fec.accounts.${line.account}`),
        compAuxNum: line.aux ? aux.num : '',
        compAuxLib: line.aux ? aux.lib : '',
        pieceRef: clean(entry.doc.number),
        pieceDate: formatFecDate(entry.doc.issuedAt),
        ecritureLib: entry.label,
        debitCents: line.debit,
        creditCents: line.credit,
        validDate: date,
        currencyAmountCents: foreign ? line.debit + line.credit : null,
        currency: foreign ? entry.doc.currency : '',
      })
    }
  }
  return result
}

export function renderFec(lines: FecLine[]): Buffer {
  const rows = lines.map((line) =>
    [
      line.journalCode,
      line.journalLib,
      line.ecritureNum,
      line.ecritureDate,
      line.compteNum,
      line.compteLib,
      line.compAuxNum,
      line.compAuxLib,
      line.pieceRef,
      line.pieceDate,
      line.ecritureLib,
      formatFecAmount(line.debitCents),
      formatFecAmount(line.creditCents),
      '',
      '',
      line.validDate,
      line.currencyAmountCents === null ? '' : formatFecAmount(line.currencyAmountCents),
      line.currency,
    ]
      .map(clean)
      .join('\t')
  )
  return encodeLatin9([FEC_COLUMNS.join('\t'), ...rows].join('\r\n') + '\r\n')
}

/** `<SIREN>FEC<AAAAMMJJ>.txt`, la date étant la clôture de l'exercice. */
export function fecFilename(siren: string | null, year: number): string {
  return `${siren ?? ''}FEC${year}1231.txt`
}

@inject()
export default class FecService {
  #yearBounds(year: number) {
    const start = DateTime.fromObject({ year, month: 1, day: 1 }).toISODate()!
    const end = DateTime.fromObject({ year, month: 12, day: 31 }).toISODate()!
    return { start, end }
  }

  /** Pièces qui produisent au moins une écriture sur l'exercice. */
  #documentsQuery(organizationId: number, year: number) {
    const { start, end } = this.#yearBounds(year)
    return Invoice.query()
      .where('organizationId', organizationId)
      .where((q) => {
        q.where((sub) => sub.where('kind', 'invoice').whereIn('status', [...FEC_INVOICE_STATUSES]))
        q.orWhere('kind', 'credit_note')
      })
      .where((q) => {
        q.whereBetween('issuedAt', [start, end]).orWhereBetween('paidAt', [start, end])
      })
  }

  async countDocuments(organizationId: number, year: number): Promise<number> {
    const [row] = await this.#documentsQuery(organizationId, year)
      .count('* as total')
      .pojo<{ total: number | string }>()
    return Number(row?.total ?? 0)
  }

  async generate(org: Organization, year: number, i18n: I18n): Promise<ExportFile> {
    const invoices = await this.#documentsQuery(org.id, year)
      .select(FEC_DOCUMENT_COLUMNS)
      .orderBy('issuedAt', 'asc')
      .orderBy('id', 'asc')

    // Avoirs non remboursés des factures réglées sur l'exercice, même émis
    // avant : ils réduisent le montant du règlement.
    const paidIds = invoices.filter((i) => i.kind === 'invoice' && i.paidAt).map((i) => i.id)
    const loadedIds = new Set(invoices.map((i) => i.id))
    const unrefundedCredits =
      paidIds.length === 0
        ? []
        : await Invoice.query()
            .where('organizationId', org.id)
            .where('kind', 'credit_note')
            .whereIn('creditedInvoiceId', paidIds)
            .whereNull('paidAt')
            .select(FEC_DOCUMENT_COLUMNS)
    const extraCredits = unrefundedCredits.filter((credit) => !loadedIds.has(credit.id))

    const documents: FecDocument[] = [...invoices, ...extraCredits].map((invoice) => ({
      id: invoice.id,
      kind: invoice.kind === 'credit_note' ? 'credit_note' : 'invoice',
      number: invoice.number,
      issuedAt: invoice.issuedAt.toISODate()!,
      paidAt: invoice.paidAt?.toISODate() ?? null,
      clientId: invoice.clientId,
      clientName: invoice.clientName,
      subtotalCents: toCents(invoice.subtotal),
      taxCents: toCents(invoice.taxAmount),
      totalCents: toCents(invoice.total),
      currency: invoice.currency,
      creditedInvoiceId: invoice.creditedInvoiceId,
    }))

    const lines = buildFecLines(documents, {
      year,
      accounts: {
        sales: org.accountingSalesAccount,
        vat: org.accountingVatAccount,
        customers: org.accountingCustomerAccount,
        bank: org.accountingBankAccount,
      },
      t: (key, params) => i18n.t(key, params),
    })

    return {
      filename: fecFilename(org.accountingSiren, year),
      contentType: 'text/plain; charset=iso-8859-15',
      buffer: renderFec(lines),
      rowCount: lines.length,
    }
  }
}
