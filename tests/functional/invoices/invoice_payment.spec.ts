import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { InvoiceFactory } from '#database/factories/invoice_factory'
import Invoice from '#models/invoice'
import { createEnterpriseAdminUser } from '#tests/functional/helpers'

/**
 * `PATCH /invoices/:id/payment` — la seule écriture qu'une facture émise accepte
 * encore (#717) : sa date et son moyen de paiement.
 *
 * L'invariant tenu par cette route : `paid_at is not null ⇔ status = 'paid'`.
 * Une date posée règle la facture, une date effacée la remet à `sent` — jamais
 * de brouillon qui affirme avoir été payé le 12 août.
 */
test.group('Factures — paiement d’une facture émise', (group) => {
  group.each.setup(() => truncateDb())

  test('la date et le moyen de paiement se corrigent sur une facture payée', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await InvoiceFactory.merge({ organizationId: user.organizationId! })
      .apply('invoice')
      .apply('paid')
      .create()

    const response = await client
      .patch(`/invoices/${invoice.id}/payment`)
      .loginAs(user)
      .form({ paidAt: '2026-08-12', paymentMethod: 'transfer' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/invoices/${invoice.id}`)
    response.assertFlashMessage('success', 'Payment updated.')

    const updated = await Invoice.findOrFail(invoice.id)
    assert.equal(updated.paidAt?.toISODate(), '2026-08-12')
    assert.equal(updated.paymentMethod, 'transfer')
    assert.equal(updated.status, 'paid')
  })

  test('une facture envoyée devient payée dès qu’une date est posée', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await InvoiceFactory.merge({ organizationId: user.organizationId! })
      .apply('invoice')
      .apply('sent')
      .create()

    await client
      .patch(`/invoices/${invoice.id}/payment`)
      .loginAs(user)
      .form({ paidAt: '2026-08-12', paymentMethod: 'cash' })
      .redirects(0)

    const updated = await Invoice.findOrFail(invoice.id)
    assert.equal(updated.status, 'paid')
    assert.equal(updated.paymentMethod, 'cash')
  })

  test('effacer la date annule le paiement, statut compris', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await InvoiceFactory.merge({
      organizationId: user.organizationId!,
      paymentMethod: 'card',
    })
      .apply('invoice')
      .apply('paid')
      .create()

    await client
      .patch(`/invoices/${invoice.id}/payment`)
      .loginAs(user)
      .form({ paidAt: '' })
      .redirects(0)

    const updated = await Invoice.findOrFail(invoice.id)
    assert.isNull(updated.paidAt)
    assert.isNull(updated.paymentMethod)
    assert.equal(updated.status, 'sent')
  })

  test('un moyen de paiement non soumis n’efface pas celui déjà enregistré', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await InvoiceFactory.merge({
      organizationId: user.organizationId!,
      paymentMethod: 'check',
    })
      .apply('invoice')
      .apply('paid')
      .create()

    await client
      .patch(`/invoices/${invoice.id}/payment`)
      .loginAs(user)
      .form({ paidAt: '2026-08-13' })
      .redirects(0)

    const updated = await Invoice.findOrFail(invoice.id)
    assert.equal(updated.paidAt?.toISODate(), '2026-08-13')
    assert.equal(updated.paymentMethod, 'check')
  })

  test('les montants, le numéro et la date d’émission restent hors de portée', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await InvoiceFactory.merge({ organizationId: user.organizationId! })
      .apply('invoice')
      .apply('paid')
      .create()

    await client
      .patch(`/invoices/${invoice.id}/payment`)
      .loginAs(user)
      .form({
        'paidAt': '2026-08-12',
        'paymentMethod': 'check',
        // Champs non reconnus par le validateur dédié : ignorés.
        'total': 1,
        'number': 'FAC-999999',
        'issuedAt': '2020-01-01',
        'lines[0][label]': 'Ligne pirate',
        'lines[0][quantity]': 1,
        'lines[0][unitPrice]': 1,
      })
      .redirects(0)

    const updated = await Invoice.findOrFail(invoice.id)
    assert.equal(Number(updated.total), 120)
    assert.equal(updated.number, invoice.number)
    assert.equal(updated.issuedAt.toISODate(), invoice.issuedAt.toISODate())
  })

  test('un moyen de paiement inconnu est refusé', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await InvoiceFactory.merge({ organizationId: user.organizationId! })
      .apply('invoice')
      .apply('paid')
      .create()

    const response = await client
      .patch(`/invoices/${invoice.id}/payment`)
      .loginAs(user)
      .form({ paidAt: '2026-08-12', paymentMethod: 'bitcoin' })
      .redirects(0)

    response.assertStatus(302)
    const updated = await Invoice.findOrFail(invoice.id)
    assert.isNull(updated.paymentMethod)
  })

  test('un devis n’a pas de paiement à corriger', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const quote = await InvoiceFactory.merge({ organizationId: user.organizationId! })
      .apply('sent')
      .create()

    const response = await client
      .patch(`/invoices/${quote.id}/payment`)
      .loginAs(user)
      .form({ paidAt: '2026-08-12' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', "This document's payment cannot be edited.")
    const updated = await Invoice.findOrFail(quote.id)
    assert.isNull(updated.paidAt)
  })

  test('une facture annulée non plus', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const invoice = await InvoiceFactory.merge({
      organizationId: user.organizationId!,
      status: 'cancelled',
    })
      .apply('invoice')
      .create()

    await client
      .patch(`/invoices/${invoice.id}/payment`)
      .loginAs(user)
      .form({ paidAt: '2026-08-12' })
      .redirects(0)

    const updated = await Invoice.findOrFail(invoice.id)
    assert.isNull(updated.paidAt)
    assert.equal(updated.status, 'cancelled')
  })

  test('une facture d’une autre organisation reste inaccessible (IDOR)', async ({
    client,
    assert,
  }) => {
    const owner = await createEnterpriseAdminUser()
    const invoice = await InvoiceFactory.merge({ organizationId: owner.organizationId! })
      .apply('invoice')
      .apply('sent')
      .create()
    const attacker = await createEnterpriseAdminUser()

    const response = await client
      .patch(`/invoices/${invoice.id}/payment`)
      .loginAs(attacker)
      .form({ paidAt: '2026-08-12' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/invoices')
    const updated = await Invoice.findOrFail(invoice.id)
    assert.isNull(updated.paidAt)
    assert.equal(updated.status, 'sent')
  })
})
