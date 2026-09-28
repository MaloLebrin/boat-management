import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import AuditLog from '#models/audit_log'
import Client from '#models/client'
import Invoice from '#models/invoice'
import InvoiceReminder from '#models/invoice_reminder'
import Notification from '#models/notification'
import Organization from '#models/organization'
import { truncateDb } from '#tests/utils/db'
import { createEnterpriseAdminUser, createMemberUser } from '#tests/functional/helpers'

/**
 * Relances des factures en retard depuis l'interface (#878) : « Relancer
 * maintenant », « ne plus relancer », réglages de `/settings/billing`.
 */

async function overdueInvoice(
  organizationId: number,
  overrides: Partial<{ status: Invoice['status']; email: string | null }> = {}
) {
  const client = await Client.create({
    organizationId,
    firstName: 'Alice',
    lastName: 'Martin',
    email: overrides.email === undefined ? 'alice@example.com' : overrides.email,
    status: 'active',
  })
  return Invoice.create({
    organizationId,
    clientId: client.id,
    kind: 'invoice',
    number: 'FAC-000007',
    clientName: 'Alice Martin',
    status: overrides.status ?? 'overdue',
    issuedAt: DateTime.now().minus({ days: 40 }),
    dueAt: DateTime.now().minus({ days: 5 }),
    subtotal: '100.00',
    taxRate: '20.00',
    taxAmount: '20.00',
    total: '120.00',
    currency: 'EUR',
  })
}

test.group('Invoice reminders — remind now', (group) => {
  group.each.setup(() => truncateDb())

  test('an admin reminds an overdue invoice: e-mail sent, history and audit written', async ({
    client,
    assert,
  }) => {
    const { messages } = mail.fake()
    const user = await createEnterpriseAdminUser()
    const invoice = await overdueInvoice(user.organizationId!)

    const response = await client
      .post(`/invoices/${invoice.id}/reminders`)
      .loginAs(user)
      .header('referer', `/invoices/${invoice.id}`)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'Reminder sent to the client.')
    messages.assertSentCount(1)
    assert.isTrue(messages.sent()[0].hasTo('alice@example.com'))

    const reminder = await InvoiceReminder.findByOrFail('invoiceId', invoice.id)
    assert.equal(reminder.trigger, 'manual')
    assert.equal(reminder.tier, 1)
    assert.equal(reminder.userId, user.id)

    const reloaded = await Invoice.findOrFail(invoice.id)
    assert.equal(reloaded.reminderCount, 1)

    const audit = await AuditLog.query().where('action', 'invoice.reminder_sent').firstOrFail()
    assert.equal(audit.userId, user.id)
    // Geste de l'utilisateur : pas de notification à lui-même.
    assert.lengthOf(await Notification.query().where('type', 'invoice.reminder_sent'), 0)
  })

  test('a second manual reminder moves to the next tier', async ({ client, assert }) => {
    mail.fake()
    const user = await createEnterpriseAdminUser()
    const invoice = await overdueInvoice(user.organizationId!)

    for (let i = 0; i < 2; i++) {
      await client.post(`/invoices/${invoice.id}/reminders`).loginAs(user).redirects(0)
    }

    const reminders = await InvoiceReminder.query().where('invoiceId', invoice.id).orderBy('id')
    assert.deepEqual(
      reminders.map((r) => r.tier),
      [1, 2]
    )
    const reloaded = await Invoice.findOrFail(invoice.id)
    assert.equal(reloaded.reminderCount, 2)
  })

  test('a client without e-mail cannot be reminded', async ({ client, assert }) => {
    const { messages } = mail.fake()
    const user = await createEnterpriseAdminUser()
    const invoice = await overdueInvoice(user.organizationId!, { email: null })

    const response = await client
      .post(`/invoices/${invoice.id}/reminders`)
      .loginAs(user)
      .header('referer', `/invoices/${invoice.id}`)
      .redirects(0)

    response.assertFlashMessage('error', 'Cannot send a reminder: client has no e-mail.')
    messages.assertNoneSent()
    assert.lengthOf(await InvoiceReminder.all(), 0)
  })

  test('an invoice that is not overdue cannot be reminded', async ({ client, assert }) => {
    const { messages } = mail.fake()
    const user = await createEnterpriseAdminUser()
    const invoice = await overdueInvoice(user.organizationId!, { status: 'paid' })

    const response = await client
      .post(`/invoices/${invoice.id}/reminders`)
      .loginAs(user)
      .header('referer', `/invoices/${invoice.id}`)
      .redirects(0)

    response.assertFlashMessage(
      'error',
      'Only an overdue invoice whose reminders are not turned off can be reminded.'
    )
    messages.assertNoneSent()
    assert.lengthOf(await InvoiceReminder.all(), 0)
  })

  test("another organization's invoice is not found", async ({ client, assert }) => {
    mail.fake()
    const user = await createEnterpriseAdminUser()
    const other = await createEnterpriseAdminUser()
    const invoice = await overdueInvoice(other.organizationId!)

    const response = await client
      .post(`/invoices/${invoice.id}/reminders`)
      .loginAs(user)
      .redirects(0)

    response.assertHeader('location', '/invoices')
    assert.lengthOf(await InvoiceReminder.all(), 0)
  })
})

test.group('Invoice reminders — stop reminding', (group) => {
  group.each.setup(() => truncateDb())

  test('« stop reminding » blocks every reminder, then can be turned back off', async ({
    client,
    assert,
  }) => {
    const { messages } = mail.fake()
    const user = await createEnterpriseAdminUser()
    const invoice = await overdueInvoice(user.organizationId!)

    const off = await client
      .patch(`/invoices/${invoice.id}/reminders`)
      .loginAs(user)
      .json({ disabled: true })
      .redirects(0)
    off.assertFlashMessage('success', 'This invoice will no longer be reminded.')
    const turnedOff = await Invoice.findOrFail(invoice.id)
    assert.isTrue(turnedOff.remindersDisabled)

    const blocked = await client
      .post(`/invoices/${invoice.id}/reminders`)
      .loginAs(user)
      .redirects(0)
    blocked.assertFlashMessage(
      'error',
      'Only an overdue invoice whose reminders are not turned off can be reminded.'
    )
    messages.assertNoneSent()

    await client
      .patch(`/invoices/${invoice.id}/reminders`)
      .loginAs(user)
      .json({ disabled: false })
      .redirects(0)
    const turnedOn = await Invoice.findOrFail(invoice.id)
    assert.isFalse(turnedOn.remindersDisabled)

    const logs = await AuditLog.query().orderBy('id')
    assert.deepEqual(
      logs.map((log) => log.action),
      ['invoice.reminders_disabled', 'invoice.reminders_enabled']
    )
  })

  test('the invoice page carries the reminders block', async ({ client, assert }) => {
    mail.fake()
    const user = await createEnterpriseAdminUser()
    const invoice = await overdueInvoice(user.organizationId!)
    await client.post(`/invoices/${invoice.id}/reminders`).loginAs(user).redirects(0)

    const response = await client.get(`/invoices/${invoice.id}`).loginAs(user).withInertia()
    const reminders = response.inertiaProps.reminders as Record<string, unknown>
    assert.equal(reminders.count, 1)
    assert.isFalse(reminders.disabled)
    assert.isFalse(reminders.automaticEnabled)
    const history = reminders.history as Array<Record<string, unknown>>
    assert.lengthOf(history, 1)
    assert.equal(history[0].trigger, 'manual')
    assert.equal(history[0].userName, user.fullName)

    const list = await client.get('/invoices').loginAs(user).withInertia()
    const rows = (list.inertiaProps.invoices as { data: Array<Record<string, unknown>> }).data
    assert.equal(rows[0].reminderCount, 1)
  })
})

test.group('Invoice reminders — settings', (group) => {
  group.each.setup(() => truncateDb())

  test('an admin turns reminders on with a message and a penalty notice', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()

    const response = await client
      .patch('/settings/billing/invoice-reminders')
      .loginAs(user)
      .json({
        enabled: true,
        message: '  Appelez-nous.  ',
        latePenaltyNote: 'Pénalités : 10 %.',
      })
      .redirects(0)

    response.assertHeader('location', '/settings/billing')
    response.assertFlashMessage('success', 'Reminder settings saved.')
    const org = await Organization.findOrFail(user.organizationId)
    assert.isTrue(org.invoiceRemindersEnabled)
    assert.equal(org.invoiceReminderMessage, 'Appelez-nous.')
    assert.equal(org.invoiceLatePenaltyNote, 'Pénalités : 10 %.')
    assert.lengthOf(await AuditLog.query().where('action', 'invoice_reminders.update'), 1)

    const page = await client.get('/settings/billing').loginAs(user).withInertia()
    const settings = page.inertiaProps.invoiceReminders as Record<string, unknown>
    assert.isTrue(settings.enabled)
    assert.isTrue(settings.available)
    assert.deepEqual(settings.tiers, [3, 10, 30])
  })

  test('a member cannot change the settings', async ({ client, assert }) => {
    const admin = await createEnterpriseAdminUser()
    const member = await createMemberUser(admin.organizationId!)

    const response = await client
      .patch('/settings/billing/invoice-reminders')
      .loginAs(member)
      .header('Accept', 'application/json')
      .json({ enabled: true })
      .redirects(0)

    response.assertStatus(403)
    const org = await Organization.findOrFail(admin.organizationId)
    assert.isFalse(org.invoiceRemindersEnabled)
  })

  test('a message longer than 1000 characters is refused', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    await client
      .patch('/settings/billing/invoice-reminders')
      .loginAs(user)
      .header('referer', '/settings/billing')
      .form({ enabled: 'true', message: 'x'.repeat(1001) })
      .redirects(0)

    const org = await Organization.findOrFail(user.organizationId)
    assert.isFalse(org.invoiceRemindersEnabled)
    assert.isNull(org.invoiceReminderMessage)
  })
})
