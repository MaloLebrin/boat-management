import { test } from '@japa/runner'
import {
  canEditInvoice,
  canEditInvoicePayment,
  canIssueCreditNote,
  creditableRemaining,
  invoiceBalanceDue,
  isIssuedInvoice,
  INVOICE_PAYMENT_METHODS,
  isInvoicePayableOnline,
} from '#shared/helpers/invoice_lifecycle'

/**
 * Règles de verrouillage d'une pièce comptable (#717) : une facture émise est
 * figée, un devis et un brouillon ne le sont pas.
 */
test.group('invoice_lifecycle — facture émise', () => {
  test('une facture sortie du brouillon est émise', ({ assert }) => {
    for (const status of ['sent', 'paid', 'overdue', 'cancelled'] as const) {
      assert.isTrue(isIssuedInvoice({ kind: 'invoice', status }), status)
      assert.isFalse(canEditInvoice({ kind: 'invoice', status }), status)
    }
  })

  test('une facture brouillon ne l’est pas', ({ assert }) => {
    assert.isFalse(isIssuedInvoice({ kind: 'invoice', status: 'draft' }))
    assert.isTrue(canEditInvoice({ kind: 'invoice', status: 'draft' }))
  })

  test('un devis n’est jamais une pièce émise, quel que soit son statut', ({ assert }) => {
    for (const status of ['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const) {
      assert.isFalse(isIssuedInvoice({ kind: 'quote', status }), status)
      assert.isTrue(canEditInvoice({ kind: 'quote', status }), status)
    }
  })
})

test.group('invoice_lifecycle — édition du paiement', () => {
  test('ouverte sur une facture émise et non annulée', ({ assert }) => {
    for (const status of ['sent', 'paid', 'overdue'] as const) {
      assert.isTrue(canEditInvoicePayment({ kind: 'invoice', status }), status)
    }
  })

  test('fermée sur un brouillon, une facture annulée et un devis', ({ assert }) => {
    assert.isFalse(canEditInvoicePayment({ kind: 'invoice', status: 'draft' }))
    assert.isFalse(canEditInvoicePayment({ kind: 'invoice', status: 'cancelled' }))
    assert.isFalse(canEditInvoicePayment({ kind: 'quote', status: 'sent' }))
  })

  test('les moyens de paiement proposés sont uniques et non vides', ({ assert }) => {
    assert.isAbove(INVOICE_PAYMENT_METHODS.length, 0)
    assert.lengthOf(new Set(INVOICE_PAYMENT_METHODS), INVOICE_PAYMENT_METHODS.length)
  })
})

test.group('invoice_lifecycle — paiement en ligne (#876)', () => {
  const payable = { kind: 'invoice', status: 'sent', paidAt: null, total: '120.50' } as const

  test('une facture envoyée ou en retard, non réglée et positive est payable', ({ assert }) => {
    assert.isTrue(isInvoicePayableOnline(payable))
    assert.isTrue(isInvoicePayableOnline({ ...payable, status: 'overdue' }))
  })

  test('ni un devis, ni un brouillon, ni une facture réglée, annulée ou à zéro', ({ assert }) => {
    assert.isFalse(isInvoicePayableOnline({ ...payable, kind: 'quote' }))
    for (const status of ['draft', 'paid', 'cancelled'] as const) {
      assert.isFalse(isInvoicePayableOnline({ ...payable, status }), status)
    }
    assert.isFalse(isInvoicePayableOnline({ ...payable, paidAt: '2026-08-01' }))
    assert.isFalse(isInvoicePayableOnline({ ...payable, total: 0 }))
  })

  test('« online » ne se saisit pas à la main', ({ assert }) => {
    assert.notInclude(INVOICE_PAYMENT_METHODS as readonly string[], 'online')
  })
})

/** Avoirs (#877). */
test.group('invoice_lifecycle — avoirs', () => {
  test('un avoir est toujours une pièce émise, figée', ({ assert }) => {
    for (const status of ['sent', 'paid'] as const) {
      assert.isTrue(isIssuedInvoice({ kind: 'credit_note', status }), status)
      assert.isFalse(canEditInvoice({ kind: 'credit_note', status }), status)
      // Son « paiement » est le remboursement : il se saisit.
      assert.isTrue(canEditInvoicePayment({ kind: 'credit_note', status }), status)
    }
  })

  test('seule une facture envoyée, en retard ou payée accepte un avoir', ({ assert }) => {
    for (const status of ['sent', 'overdue', 'paid'] as const) {
      assert.isTrue(canIssueCreditNote({ kind: 'invoice', status }), status)
    }
    for (const status of ['draft', 'cancelled', 'credited'] as const) {
      assert.isFalse(canIssueCreditNote({ kind: 'invoice', status }), status)
    }
    assert.isFalse(canIssueCreditNote({ kind: 'quote', status: 'sent' }))
    assert.isFalse(canIssueCreditNote({ kind: 'credit_note', status: 'sent' }))
  })

  test('une facture entièrement avoirée n’encaisse plus rien', ({ assert }) => {
    assert.isFalse(canEditInvoicePayment({ kind: 'invoice', status: 'credited' }))
    assert.isFalse(
      isInvoicePayableOnline({ kind: 'invoice', status: 'credited', paidAt: null, total: 120 })
    )
  })

  test('le reste créditable ne descend jamais sous zéro, au centime près', ({ assert }) => {
    assert.equal(creditableRemaining(120, 24), 96)
    assert.equal(creditableRemaining(100.1, 33.37), 66.73)
    assert.equal(creditableRemaining(120, 150), 0)
  })

  test('le reste à régler est net des avoirs, nul une fois payée ou soldée', ({ assert }) => {
    const sent = { kind: 'invoice', status: 'sent', paidAt: null, total: '120' } as const
    assert.equal(invoiceBalanceDue(sent, 0), 120)
    assert.equal(invoiceBalanceDue(sent, 24), 96)
    assert.equal(invoiceBalanceDue({ ...sent, status: 'overdue' }, 20), 100)
    assert.equal(invoiceBalanceDue({ ...sent, status: 'paid', paidAt: '2026-08-01' }, 24), 0)
    assert.equal(invoiceBalanceDue({ ...sent, status: 'credited' }, 120), 0)
    assert.equal(invoiceBalanceDue({ ...sent, status: 'draft' }, 0), 0)
    assert.equal(invoiceBalanceDue({ ...sent, kind: 'credit_note' }, 0), 0)
  })
})
