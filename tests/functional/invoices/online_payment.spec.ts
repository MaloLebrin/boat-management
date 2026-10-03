import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import mail from '@adonisjs/mail/services/main'
import AuditLog from '#models/audit_log'
import Client from '#models/client'
import Invoice from '#models/invoice'
import Notification from '#models/notification'
import Organization from '#models/organization'
import { truncateDb } from '#tests/utils/db'
import {
  createAdminUser,
  createEnterpriseAdminUser,
  createMemberUser,
} from '#tests/functional/helpers'
import { swapStripeConnectService } from '#tests/support/fakes'
import {
  postStripeConnectWebhook,
  stripeConnectEvent,
  stripeInvoiceCheckoutSession,
} from '#tests/support/stripe'
import type User from '#models/user'

/**
 * Paiement en ligne des factures par le client final (#876).
 *
 * Stripe est simulé pour les seuls appels réseau (compte connecté, lien
 * d'onboarding, session Checkout) ; la signature du webhook des comptes
 * connectés est la vraie, vérifiée avec le secret factice de `.env.test`.
 */

async function connectedOrg(user: User, accountId = `acct_${user.organizationId}`) {
  const org = await Organization.findOrFail(user.organizationId)
  org.stripeConnectAccountId = accountId
  org.stripeConnectChargesEnabled = true
  org.stripeConnectDetailsSubmitted = true
  await org.save()
  return org
}

async function sentInvoice(
  organizationId: number,
  overrides: Partial<{
    status: Invoice['status']
    number: string
    total: string
    paymentToken: string | null
    kind: Invoice['kind']
    currency: string
  }> = {}
) {
  const client = await Client.create({
    organizationId,
    firstName: 'Alice',
    lastName: 'Martin',
    email: 'alice@example.com',
    status: 'active',
  })
  return Invoice.create({
    organizationId,
    clientId: client.id,
    kind: overrides.kind ?? 'invoice',
    number: overrides.number ?? 'FAC-000001',
    clientName: 'Alice Martin',
    status: overrides.status ?? 'sent',
    issuedAt: DateTime.fromISO('2026-07-05'),
    dueAt: DateTime.fromISO('2026-08-05'),
    subtotal: '100.00',
    taxRate: '20.00',
    taxAmount: '20.00',
    total: overrides.total ?? '120.50',
    currency: overrides.currency ?? 'EUR',
    paymentToken: overrides.paymentToken === undefined ? 'tok_public_1' : overrides.paymentToken,
  })
}

test.group('Online payments — Stripe account connection (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('an admin starts onboarding: account created, audited, sent to Stripe', async ({
    client,
    assert,
    cleanup,
  }) => {
    const stripe = swapStripeConnectService()
    cleanup(() => stripe.restore())
    const admin = await createEnterpriseAdminUser()

    const response = await client
      .post('/settings/billing/online-payments')
      .loginAs(admin)
      .withInertia()
      .redirects(0)

    response.assertStatus(409)
    response.assertHeader(
      'x-inertia-location',
      `https://connect.stripe.test/setup/acct_fake_${admin.organizationId}`
    )
    assert.deepEqual(stripe.createdAccounts, [
      { organizationId: admin.organizationId!, email: admin.email },
    ])
    assert.match(stripe.accountLinks[0].returnUrl, /\/settings\/billing\/online-payments\/return$/)

    const org = await Organization.findOrFail(admin.organizationId)
    assert.equal(org.stripeConnectAccountId, `acct_fake_${admin.organizationId}`)
    assert.isFalse(org.stripeConnectChargesEnabled)
    const log = await AuditLog.query().where('action', 'online_payments.connect').firstOrFail()
    assert.equal(log.userId, admin.id)
  })

  test('resuming onboarding reuses the existing account', async ({ client, assert, cleanup }) => {
    const stripe = swapStripeConnectService()
    cleanup(() => stripe.restore())
    const admin = await createEnterpriseAdminUser()
    const org = await Organization.findOrFail(admin.organizationId)
    org.stripeConnectAccountId = 'acct_existing'
    await org.save()

    await client.post('/settings/billing/online-payments').loginAs(admin).withInertia().redirects(0)

    assert.lengthOf(stripe.createdAccounts, 0)
    assert.equal(stripe.accountLinks[0].accountId, 'acct_existing')
  })

  test('a member cannot connect the organization account', async ({ client, assert, cleanup }) => {
    const stripe = swapStripeConnectService()
    cleanup(() => stripe.restore())
    const admin = await createEnterpriseAdminUser()
    const member = await createMemberUser(admin.organizationId!)

    const response = await client
      .post('/settings/billing/online-payments')
      .loginAs(member)
      .header('Accept', 'application/json')
      .redirects(0)

    response.assertStatus(403)
    assert.lengthOf(stripe.createdAccounts, 0)
  })

  test('without the Invoicing module, onboarding is refused', async ({
    client,
    assert,
    cleanup,
  }) => {
    const stripe = swapStripeConnectService()
    cleanup(() => stripe.restore())
    const admin = await createAdminUser('pro')

    const response = await client
      .post('/settings/billing/online-payments')
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/settings/billing')
    response.assertFlashMessage('error')
    assert.lengthOf(stripe.createdAccounts, 0)
  })

  test('the onboarding return reads the account state from Stripe', async ({
    client,
    assert,
    cleanup,
  }) => {
    const stripe = swapStripeConnectService({ chargesEnabled: true })
    cleanup(() => stripe.restore())
    const admin = await createEnterpriseAdminUser()
    const org = await Organization.findOrFail(admin.organizationId)
    org.stripeConnectAccountId = 'acct_returning'
    await org.save()

    const response = await client
      .get('/settings/billing/online-payments/return')
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success')
    await org.refresh()
    assert.isTrue(org.stripeConnectChargesEnabled)
    assert.isTrue(org.stripeConnectDetailsSubmitted)
  })

  test('disconnecting forgets the account and is audited', async ({ client, assert }) => {
    const admin = await createEnterpriseAdminUser()
    const org = await connectedOrg(admin)

    const response = await client
      .delete('/settings/billing/online-payments')
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)
    await org.refresh()
    assert.isNull(org.stripeConnectAccountId)
    assert.isFalse(org.stripeConnectChargesEnabled)
    assert.exists(await AuditLog.query().where('action', 'online_payments.disconnect').first())
  })

  test('the billing page exposes the connection state', async ({ client, cleanup }) => {
    const stripe = swapStripeConnectService()
    cleanup(() => stripe.restore())
    const admin = await createEnterpriseAdminUser()
    await connectedOrg(admin)

    const response = await client.get('/settings/billing').loginAs(admin).withInertia()

    response.assertStatus(200)
    response.assertInertiaPropsContains({
      onlinePayments: { available: true, state: 'active', canManage: true },
    })
  })
})

test.group('Online payments — payment link on the invoice (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('sending an invoice sets its payment link and puts it in the email', async ({
    client,
    assert,
    cleanup,
  }) => {
    const { messages } = mail.fake()
    cleanup(() => mail.restore())
    const admin = await createEnterpriseAdminUser()
    await connectedOrg(admin)
    const invoice = await sentInvoice(admin.organizationId!, {
      status: 'draft',
      paymentToken: null,
    })

    await client.post(`/invoices/${invoice.id}/send`).loginAs(admin).redirects(0)

    await invoice.refresh()
    assert.equal(invoice.status, 'sent')
    assert.isString(invoice.paymentToken)
    assert.isAbove(invoice.paymentToken!.length, 30)

    // File synchrone en test : l'e-mail est déjà parti, avec le bouton.
    const sent = messages.sent().at(-1)!.toObject().message as { text: string; html: string }
    assert.include(sent.html, `/pay/${invoice.paymentToken}`)
    assert.include(sent.html, 'Pay online')
    assert.include(sent.text, `/pay/${invoice.paymentToken}`)

    const show = await client.get(`/invoices/${invoice.id}`).loginAs(admin).withInertia()
    const props = show.inertiaProps as { invoice: { onlinePaymentUrl: string | null } }
    assert.match(props.invoice.onlinePaymentUrl ?? '', new RegExp(`/pay/${invoice.paymentToken}$`))
  })

  test('without a connected account, sending sets no payment link', async ({
    client,
    assert,
    cleanup,
  }) => {
    const { messages } = mail.fake()
    cleanup(() => mail.restore())
    const admin = await createEnterpriseAdminUser()
    const invoice = await sentInvoice(admin.organizationId!, {
      status: 'draft',
      paymentToken: null,
    })

    await client.post(`/invoices/${invoice.id}/send`).loginAs(admin).redirects(0)

    await invoice.refresh()
    assert.isNull(invoice.paymentToken)
    const sent = messages.sent().at(-1)!.toObject().message as { html: string }
    assert.notInclude(sent.html, '/pay/')
  })

  test('a link can be created for an invoice sent before connecting', async ({
    client,
    assert,
  }) => {
    const admin = await createEnterpriseAdminUser()
    await connectedOrg(admin)
    const invoice = await sentInvoice(admin.organizationId!, { paymentToken: null })

    const response = await client
      .post(`/invoices/${invoice.id}/payment-link`)
      .loginAs(admin)
      .redirects(0)

    response.assertFlashMessage('success')
    await invoice.refresh()
    assert.isString(invoice.paymentToken)
  })

  test('a paid invoice gets no payment link', async ({ client, assert }) => {
    const admin = await createEnterpriseAdminUser()
    await connectedOrg(admin)
    const invoice = await sentInvoice(admin.organizationId!, {
      status: 'paid',
      paymentToken: null,
    })

    const response = await client
      .post(`/invoices/${invoice.id}/payment-link`)
      .loginAs(admin)
      .redirects(0)

    response.assertFlashMessage('error')
    await invoice.refresh()
    assert.isNull(invoice.paymentToken)
  })
})

test.group('Online payments — public payment page (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('shows a payable invoice without login', async ({ client }) => {
    const admin = await createEnterpriseAdminUser()
    const org = await connectedOrg(admin)
    await sentInvoice(admin.organizationId!)

    const response = await client.get('/pay/tok_public_1').withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('pay/show')
    response.assertInertiaPropsContains({
      payment: {
        token: 'tok_public_1',
        state: 'payable',
        organizationName: org.name,
        number: 'FAC-000001',
        total: 120.5,
        currency: 'EUR',
        returnedFromCheckout: false,
      },
    })
  })

  test('an unknown token renders the invalid-link page with a 404', async ({ client }) => {
    const response = await client.get('/pay/does-not-exist').withInertia()

    response.assertStatus(404)
    response.assertInertiaComponent('pay/show')
    response.assertInertiaPropsContains({ payment: null })
  })

  test('a paid invoice shows as paid, a disconnected org as unavailable', async ({
    client,
    assert,
  }) => {
    const admin = await createEnterpriseAdminUser()
    const org = await connectedOrg(admin)
    await sentInvoice(admin.organizationId!, { status: 'paid' })
    await sentInvoice(admin.organizationId!, { number: 'FAC-000002', paymentToken: 'tok_2' })

    const paid = await client.get('/pay/tok_public_1').withInertia()
    assert.equal((paid.inertiaProps as { payment: { state: string } }).payment.state, 'paid')

    org.stripeConnectAccountId = null
    org.stripeConnectChargesEnabled = false
    await org.save()
    const unavailable = await client.get('/pay/tok_2').withInertia()
    assert.equal(
      (unavailable.inertiaProps as { payment: { state: string } }).payment.state,
      'unavailable'
    )
  })

  test('paying opens a Checkout session on the connected account', async ({
    client,
    assert,
    cleanup,
  }) => {
    const stripe = swapStripeConnectService()
    cleanup(() => stripe.restore())
    const admin = await createEnterpriseAdminUser()
    await connectedOrg(admin, 'acct_lessor')
    const invoice = await sentInvoice(admin.organizationId!)

    const response = await client.post('/pay/tok_public_1/checkout').withInertia().redirects(0)

    response.assertStatus(409)
    response.assertHeader('x-inertia-location', 'https://checkout.stripe.test/cs_fake_1')
    assert.lengthOf(stripe.checkoutSessions, 1)
    const [session] = stripe.checkoutSessions
    assert.equal(session.accountId, 'acct_lessor')
    assert.equal(session.amountCents, 12050)
    assert.equal(session.currency, 'EUR')
    assert.equal(session.customerEmail, 'alice@example.com')
    assert.deepEqual(session.metadata, {
      invoice_id: String(invoice.id),
      organization_id: String(admin.organizationId),
    })
    assert.match(session.successUrl, /\/pay\/tok_public_1\?status=success$/)

    await invoice.refresh()
    assert.equal(invoice.stripeCheckoutSessionId, 'cs_fake_1')
  })

  test('a zero-decimal currency is charged in whole units, not ×100 (#627)', async ({
    client,
    assert,
    cleanup,
  }) => {
    const stripe = swapStripeConnectService()
    cleanup(() => stripe.restore())
    const admin = await createEnterpriseAdminUser()
    await connectedOrg(admin, 'acct_lessor')
    await sentInvoice(admin.organizationId!, { total: '12000.00', currency: 'JPY' })

    await client.post('/pay/tok_public_1/checkout').withInertia().redirects(0)

    assert.equal(stripe.checkoutSessions[0].currency, 'JPY')
    assert.equal(stripe.checkoutSessions[0].amountCents, 12000)
  })

  test('a partially credited invoice is charged its balance only (#877)', async ({
    client,
    assert,
    cleanup,
  }) => {
    const stripe = swapStripeConnectService()
    cleanup(() => stripe.restore())
    const admin = await createEnterpriseAdminUser()
    await connectedOrg(admin, 'acct_lessor')
    const invoice = await sentInvoice(admin.organizationId!)
    await Invoice.create({
      organizationId: admin.organizationId!,
      kind: 'credit_note',
      creditedInvoiceId: invoice.id,
      number: 'AV-000001',
      status: 'sent',
      issuedAt: DateTime.now(),
      subtotal: '20.50',
      taxRate: '0',
      taxAmount: '0',
      total: '20.50',
      currency: 'EUR',
    })

    const page = await client.get('/pay/tok_public_1').withInertia()
    assert.equal((page.inertiaProps as { payment: { total: number } }).payment.total, 100)

    await client.post('/pay/tok_public_1/checkout').withInertia().redirects(0)
    assert.equal(stripe.checkoutSessions[0].amountCents, 10000)
  })

  test('a paid invoice cannot open a Checkout session', async ({ client, assert, cleanup }) => {
    const stripe = swapStripeConnectService()
    cleanup(() => stripe.restore())
    const admin = await createEnterpriseAdminUser()
    await connectedOrg(admin)
    await sentInvoice(admin.organizationId!, { status: 'paid' })

    const response = await client.post('/pay/tok_public_1/checkout').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/pay/tok_public_1')
    response.assertFlashMessage('error')
    assert.lengthOf(stripe.checkoutSessions, 0)
  })
})

test.group('Online payments — connected-account webhook (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('a completed Checkout session settles the invoice online', async ({ client, assert }) => {
    const admin = await createEnterpriseAdminUser()
    await connectedOrg(admin, 'acct_lessor')
    const invoice = await sentInvoice(admin.organizationId!)

    const event = stripeConnectEvent(
      'checkout.session.completed',
      stripeInvoiceCheckoutSession({
        invoiceId: invoice.id,
        organizationId: admin.organizationId!,
        paymentIntent: 'pi_paid',
      }),
      'acct_lessor'
    )
    const response = await postStripeConnectWebhook(client, event)

    response.assertStatus(200)
    await invoice.refresh()
    assert.equal(invoice.status, 'paid')
    assert.equal(invoice.paymentMethod, 'online')
    assert.equal(invoice.stripePaymentIntentId, 'pi_paid')
    assert.isNotNull(invoice.paidAt)

    const log = await AuditLog.query().where('action', 'invoice.paid_online').firstOrFail()
    assert.isNull(log.userId)
    assert.equal(log.entityId, invoice.id)
    const notification = await Notification.query()
      .where('type', 'invoice.paid_online')
      .firstOrFail()
    assert.equal(notification.userId, admin.id)
    assert.equal(notification.actionUrl, `/invoices/${invoice.id}`)
  })

  test('a replayed event is ignored: one notification only', async ({ client, assert }) => {
    const admin = await createEnterpriseAdminUser()
    await connectedOrg(admin, 'acct_lessor')
    const invoice = await sentInvoice(admin.organizationId!)
    const event = stripeConnectEvent(
      'checkout.session.completed',
      stripeInvoiceCheckoutSession({
        invoiceId: invoice.id,
        organizationId: invoice.organizationId,
      }),
      'acct_lessor',
      'evt_replayed'
    )

    await postStripeConnectWebhook(client, event)
    const replay = await postStripeConnectWebhook(client, event)

    replay.assertStatus(200)
    const notifications = await Notification.query().where('type', 'invoice.paid_online')
    assert.lengthOf(notifications, 1)
  })

  test("another connected account cannot settle this organization's invoice", async ({
    client,
    assert,
  }) => {
    const victim = await createEnterpriseAdminUser()
    await connectedOrg(victim, 'acct_victim')
    const attacker = await createEnterpriseAdminUser()
    await connectedOrg(attacker, 'acct_attacker')
    const invoice = await sentInvoice(victim.organizationId!)

    const event = stripeConnectEvent(
      'checkout.session.completed',
      stripeInvoiceCheckoutSession({
        invoiceId: invoice.id,
        organizationId: invoice.organizationId,
      }),
      'acct_attacker'
    )
    const response = await postStripeConnectWebhook(client, event)

    response.assertStatus(200)
    await invoice.refresh()
    assert.equal(invoice.status, 'sent')
    assert.isNull(invoice.paymentMethod)
  })

  test('a pending bank debit waits for async_payment_succeeded', async ({ client, assert }) => {
    const admin = await createEnterpriseAdminUser()
    await connectedOrg(admin, 'acct_lessor')
    const invoice = await sentInvoice(admin.organizationId!)
    const session = (paymentStatus: 'paid' | 'unpaid') =>
      stripeInvoiceCheckoutSession({
        invoiceId: invoice.id,
        organizationId: invoice.organizationId,
        paymentStatus,
      })

    await postStripeConnectWebhook(
      client,
      stripeConnectEvent('checkout.session.completed', session('unpaid'), 'acct_lessor', 'evt_1')
    )
    await invoice.refresh()
    assert.equal(invoice.status, 'sent')

    await postStripeConnectWebhook(
      client,
      stripeConnectEvent(
        'checkout.session.async_payment_succeeded',
        session('paid'),
        'acct_lessor',
        'evt_2'
      )
    )
    await invoice.refresh()
    assert.equal(invoice.status, 'paid')
    assert.equal(invoice.paymentMethod, 'online')
  })

  test('account.updated records that Stripe enabled the charges', async ({ client, assert }) => {
    const admin = await createEnterpriseAdminUser()
    const org = await Organization.findOrFail(admin.organizationId)
    org.stripeConnectAccountId = 'acct_onboarding'
    await org.save()

    await postStripeConnectWebhook(
      client,
      stripeConnectEvent(
        'account.updated',
        { id: 'acct_onboarding', charges_enabled: true, details_submitted: true },
        'acct_onboarding'
      )
    )

    await org.refresh()
    assert.isTrue(org.stripeConnectChargesEnabled)
    assert.isTrue(org.stripeConnectDetailsSubmitted)
  })

  test('an event signed with the platform secret is refused', async ({ client, assert }) => {
    const admin = await createEnterpriseAdminUser()
    await connectedOrg(admin, 'acct_lessor')
    const invoice = await sentInvoice(admin.organizationId!)

    const response = await postStripeConnectWebhook(
      client,
      stripeConnectEvent(
        'checkout.session.completed',
        stripeInvoiceCheckoutSession({
          invoiceId: invoice.id,
          organizationId: invoice.organizationId,
        }),
        'acct_lessor'
      ),
      { secret: 'whsec_test_secret' }
    )

    response.assertStatus(400)
    await invoice.refresh()
    assert.equal(invoice.status, 'sent')
  })
})
