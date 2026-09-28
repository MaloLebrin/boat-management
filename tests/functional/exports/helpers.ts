import Client from '#models/client'
import Invoice from '#models/invoice'
import InvoiceLine from '#models/invoice_line'
import type { InvoiceKind, InvoiceStatus } from '#shared/types/invoice'
import { DateTime } from 'luxon'

/**
 * Fixtures des exports (#879) : des pièces émises avec leurs lignes, sans
 * passer par le service de facturation (numérotation, verrous) qui n'est pas
 * ce qu'on teste ici.
 */

export async function createClient(
  organizationId: number,
  overrides: Partial<{ firstName: string; lastName: string; anonymizedAt: DateTime | null }> = {}
) {
  return Client.create({
    organizationId,
    firstName: overrides.firstName ?? 'Alice',
    lastName: overrides.lastName ?? 'Martin',
    email: 'alice@example.com',
    status: 'active',
    anonymizedAt: overrides.anonymizedAt ?? null,
  })
}

export async function createInvoice(
  organizationId: number,
  overrides: Partial<{
    kind: InvoiceKind
    status: InvoiceStatus
    number: string
    issuedAt: string
    paidAt: string | null
    clientId: number | null
    clientName: string
    creditedInvoiceId: number | null
    subtotal: string
    taxAmount: string
    total: string
  }> = {}
) {
  const invoice = await Invoice.create({
    organizationId,
    clientId: overrides.clientId ?? null,
    kind: overrides.kind ?? 'invoice',
    number: overrides.number ?? 'FAC-000001',
    clientName: overrides.clientName ?? 'Alice Martin',
    status: overrides.status ?? 'sent',
    issuedAt: DateTime.fromISO(overrides.issuedAt ?? '2026-03-10'),
    dueAt: DateTime.fromISO(overrides.issuedAt ?? '2026-03-10').plus({ days: 30 }),
    paidAt: overrides.paidAt ? DateTime.fromISO(overrides.paidAt) : null,
    paymentMethod: overrides.paidAt ? 'transfer' : null,
    creditedInvoiceId: overrides.creditedInvoiceId ?? null,
    subtotal: overrides.subtotal ?? '100.00',
    taxRate: '20.00',
    taxAmount: overrides.taxAmount ?? '20.00',
    total: overrides.total ?? '120.00',
    currency: 'EUR',
  })
  await InvoiceLine.create({
    invoiceId: invoice.id,
    label: 'Location semaine',
    quantity: '1',
    unitPrice: invoice.subtotal,
    amount: invoice.subtotal,
    position: 0,
  })
  return invoice
}

/** Lignes d'un CSV rendu par `buildCsv` : BOM retiré, CRLF. */
export function csvRows(text: string): string[][] {
  const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  return withoutBom.split('\r\n').map((line) => line.split(';'))
}
