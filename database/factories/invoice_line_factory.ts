import InvoiceLine from '#models/invoice_line'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'

/**
 * Une ligne unitaire de 100 € — cohérente avec les montants d'`InvoiceFactory`.
 * `invoiceId` à fournir via `merge()`.
 */
export const InvoiceLineFactory = Factory.define(
  InvoiceLine,
  ({ faker }: FactoryContextContract) => ({
    label: faker.commerce.productName(),
    quantity: '1',
    unitPrice: '100.00',
    amount: '100.00',
    position: 0,
  })
).build()
