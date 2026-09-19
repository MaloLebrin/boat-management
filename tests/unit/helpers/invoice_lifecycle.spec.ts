import { test } from '@japa/runner'
import {
  canEditInvoice,
  canEditInvoicePayment,
  isIssuedInvoice,
  INVOICE_PAYMENT_METHODS,
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
