import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { InvoiceDetail } from '../../shared/types/invoice'

const mockPost = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/vue3', () => ({
  Head: { template: '<div><slot /></div>' },
  router: { post: mockPost, delete: vi.fn(), patch: vi.fn() },
  usePage: () => ({ props: { appT: {}, locale: 'en', flash: {}, errors: {} } }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

import InvoiceCreditNotesCard from '../../inertia/components/invoices/InvoiceCreditNotesCard.vue'
import InvoiceStatusBadge from '../../inertia/components/invoices/InvoiceStatusBadge.vue'
import CreditNotePage from '../../inertia/pages/invoices/credit_note.vue'
import InvoiceShow from '../../inertia/pages/invoices/show.vue'

function makeInvoice(overrides: Partial<InvoiceDetail> = {}): InvoiceDetail {
  return {
    id: 42,
    kind: 'invoice',
    number: 'FAC-000001',
    status: 'sent',
    clientId: null,
    clientName: 'Alice Martin',
    reservationId: null,
    issuedAt: '2026-07-05',
    dueAt: null,
    paidAt: null,
    paymentMethod: null,
    sourceQuoteId: null,
    creditedInvoiceId: null,
    subtotal: 100,
    taxRate: 20,
    taxAmount: 20,
    total: 120,
    currency: 'EUR',
    createdAt: null,
    notes: null,
    lines: [
      { id: 1, label: 'Location', quantity: 1, unitPrice: 80, amount: 80, position: 0 },
      { id: 2, label: 'Skipper', quantity: 1, unitPrice: 20, amount: 20, position: 1 },
    ],
    sourceQuote: null,
    convertedInvoice: null,
    reservationBoatId: null,
    onlinePaymentUrl: null,
    creditedInvoice: null,
    creditNotes: [],
    creditedTotal: 0,
    balanceDue: 120,
    ...overrides,
  }
}

const partiallyCredited = {
  creditNotes: [
    { id: 50, number: 'AV-000001', status: 'sent' as const, issuedAt: '2026-07-10', total: 24 },
  ],
  creditedTotal: 24,
  balanceDue: 96,
}

describe('InvoiceCreditNotesCard (#877)', () => {
  test('an issued invoice offers "issue a credit note"', () => {
    const wrapper = mount(InvoiceCreditNotesCard, { props: { invoice: makeInvoice() } })
    const link = wrapper.find('a[href="/invoices/42/credit-note"]')
    expect(link.exists()).toBe(true)
    expect(wrapper.text()).toContain('invoices.creditNote.card.empty')
  })

  test('read-only mode and a fully credited invoice hide the action', () => {
    const readOnly = mount(InvoiceCreditNotesCard, {
      props: { invoice: makeInvoice(), readOnly: true },
    })
    expect(readOnly.find('a[href="/invoices/42/credit-note"]').exists()).toBe(false)

    const credited = mount(InvoiceCreditNotesCard, {
      props: { invoice: makeInvoice({ status: 'credited', ...partiallyCredited }) },
    })
    expect(credited.find('a[href="/invoices/42/credit-note"]').exists()).toBe(false)
    expect(credited.text()).toContain('invoices.creditNote.card.fullyCredited')
  })

  test('lists the credit notes and the balance due net of them', () => {
    const wrapper = mount(InvoiceCreditNotesCard, {
      props: { invoice: makeInvoice(partiallyCredited) },
    })
    expect(wrapper.find('a[href="/invoices/50"]').text()).toBe('AV-000001')
    expect(wrapper.text()).toContain('invoices.creditNote.card.balanceDue')
    expect(wrapper.text()).toMatch(/96/)
  })
})

describe('InvoiceStatusBadge on a credit note (#877)', () => {
  test('reads sent as issued and paid as refunded', () => {
    const sent = mount(InvoiceStatusBadge, { props: { status: 'sent', kind: 'credit_note' } })
    expect(sent.text()).toBe('invoices.creditNote.status.sent')
    const paid = mount(InvoiceStatusBadge, { props: { status: 'paid', kind: 'credit_note' } })
    expect(paid.text()).toBe('invoices.creditNote.status.paid')
    const invoice = mount(InvoiceStatusBadge, { props: { status: 'credited', kind: 'invoice' } })
    expect(invoice.text()).toBe('invoices.status.credited')
  })
})

describe('invoices/credit_note.vue (#877)', () => {
  beforeEach(() => vi.clearAllMocks())

  function submitButton(wrapper: ReturnType<typeof mount>) {
    return wrapper.findAll('button').find((b) => b.text() === 'invoices.creditNote.form.submit')!
  }

  test('pre-fills the mirror lines of an invoice never credited, and posts them', async () => {
    const wrapper = mount(CreditNotePage, { props: { invoice: makeInvoice() } })
    const labels = wrapper.findAll('input[name="label"]').map((i) => i.element as HTMLInputElement)
    expect(labels.map((i) => i.value)).toEqual(['Location', 'Skipper'])

    expect(submitButton(wrapper).attributes('disabled')).toBeDefined()
    await wrapper.find('textarea').setValue('Erreur de montant')
    expect(submitButton(wrapper).attributes('disabled')).toBeUndefined()

    await wrapper.find('form').trigger('submit')
    expect(mockPost).toHaveBeenCalledWith(
      '/invoices/42/credit-notes',
      {
        reason: 'Erreur de montant',
        lines: [
          { label: 'Location', quantity: 1, unitPrice: 80 },
          { label: 'Skipper', quantity: 1, unitPrice: 20 },
        ],
      },
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('warns and blocks a credit note above what remains to be credited', async () => {
    const wrapper = mount(CreditNotePage, {
      props: { invoice: makeInvoice(partiallyCredited) },
    })
    // Déjà avoirée : une ligne vide à remplir, pas de miroir.
    expect(wrapper.findAll('input[name="label"]')).toHaveLength(1)

    await wrapper.find('textarea').setValue('Remise')
    await wrapper.find('input[name="label"]').setValue('Remise')
    await wrapper.find('input[name="unitPrice"]').setValue('90')

    expect(wrapper.find('[data-testid="credit-note-exceeds"]').exists()).toBe(true)
    expect(submitButton(wrapper).attributes('disabled')).toBeDefined()

    await wrapper.find('input[name="unitPrice"]').setValue('80')
    expect(wrapper.find('[data-testid="credit-note-exceeds"]').exists()).toBe(false)
    expect(submitButton(wrapper).attributes('disabled')).toBeUndefined()
  })
})

describe('invoices/show.vue with credit notes (#877)', () => {
  test('a credit note links back to its invoice and cannot be deleted', () => {
    const wrapper = mount(InvoiceShow, {
      props: {
        invoice: makeInvoice({
          id: 50,
          kind: 'credit_note',
          number: 'AV-000001',
          creditedInvoiceId: 42,
          creditedInvoice: { id: 42, number: 'FAC-000001' },
          balanceDue: 0,
        }),
        canDelete: true,
      },
    })
    expect(wrapper.find('a[href="/invoices/42"]').text()).toContain('invoices.creditNote.creditFor')
    expect(wrapper.text()).toContain('invoices.creditNote.lockedNotice')
    expect(wrapper.text()).not.toContain('invoices.delete')
    expect(wrapper.find('a[href="/invoices/50/credit-note"]').exists()).toBe(false)
  })

  test('an invoice carrying credit notes cannot be deleted', () => {
    const wrapper = mount(InvoiceShow, {
      props: { invoice: makeInvoice(partiallyCredited), canDelete: true },
    })
    expect(wrapper.text()).not.toContain('invoices.delete')
    expect(wrapper.find('a[href="/invoices/42/credit-note"]').exists()).toBe(true)
  })
})
