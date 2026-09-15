import Invoice from '#models/invoice'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { DateTime } from 'luxon'
import { ClientFactory } from '#database/factories/client_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'

/**
 * Devis (`kind: 'quote'`) en brouillon par défaut. États : `invoice`, `sent`,
 * `paid`, `overdue`. Les montants sont cohérents entre eux (HT 100, TVA 20 %).
 */
export const InvoiceFactory = Factory.define(Invoice, ({ faker }: FactoryContextContract) => ({
  clientId: null,
  reservationId: null,
  kind: 'quote' as const,
  number: `DEV-${faker.string.numeric(6)}`,
  clientName: faker.person.fullName(),
  status: 'draft' as const,
  issuedAt: DateTime.now().startOf('day'),
  dueAt: null,
  paidAt: null,
  sourceQuoteId: null,
  subtotal: '100.00',
  taxRate: '20.00',
  taxAmount: '20.00',
  total: '120.00',
  currency: 'EUR',
  notes: null,
}))
  .state('invoice', (invoice, { faker }) => {
    invoice.kind = 'invoice'
    invoice.number = `FAC-${faker.string.numeric(6)}`
    invoice.dueAt = DateTime.now().startOf('day').plus({ days: 30 })
  })
  .state('sent', (invoice) => {
    invoice.status = 'sent'
  })
  .state('paid', (invoice) => {
    invoice.status = 'paid'
    invoice.paidAt = DateTime.now().startOf('day')
  })
  .state('overdue', (invoice) => {
    invoice.status = 'sent'
    invoice.dueAt = DateTime.now().startOf('day').minus({ days: 10 })
  })
  .relation('organization', () => OrganizationFactory)
  .relation('client', () => ClientFactory)
  .build()
