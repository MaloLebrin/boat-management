import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import AuditLog from '#models/audit_log'
import Client from '#models/client'
import Invoice from '#models/invoice'
import InvoiceReminder from '#models/invoice_reminder'
import Notification from '#models/notification'
import type Organization from '#models/organization'
import OrganizationMembership from '#models/organization_membership'
import QueueDedupKey from '#models/queue_dedup_key'
import SendInvoiceReminders from '#jobs/send_invoice_reminders'
import InvoiceReminderService from '#services/invoice_reminder_service'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { UserFactory } from '#database/factories/user_factory'
import type { PlanTier } from '#shared/types/plan'

/**
 * Relances des factures en retard — cron quotidien 06:30 (#878).
 *
 * Paliers J+3, J+10, J+30 après l'échéance, un palier ne part qu'une fois, et
 * jamais vers un client qui ne doit pas être relancé : la moindre dérive
 * écrit à un client qui a payé, qui est en litige ou qui a demandé l'oubli.
 */

const TODAY = DateTime.fromISO('2026-09-28T09:00:00', { zone: 'Europe/Paris' })

async function remindersOrg(
  options: { enabled?: boolean; plan?: PlanTier; penalty?: string | null } = {}
) {
  const org = await OrganizationFactory.merge({
    plan: options.plan ?? 'enterprise',
    invoiceRemindersEnabled: options.enabled ?? true,
    invoiceLatePenaltyNote: options.penalty ?? null,
  }).create()
  const admin = await UserFactory.merge({ organizationId: org.id }).create()
  await OrganizationMembership.create({ userId: admin.id, organizationId: org.id, role: 'admin' })
  return org
}

async function overdueInvoice(
  org: Organization,
  daysLate: number,
  overrides: Partial<{
    client: Partial<Client> | null
    status: Invoice['status']
    lastReminderTier: number
    remindersDisabled: boolean
    reference: DateTime
  }> = {}
) {
  const reference = overrides.reference ?? TODAY
  const client =
    overrides.client === null
      ? null
      : await Client.create({
          organizationId: org.id,
          firstName: 'Alice',
          lastName: 'Martin',
          email: 'alice@example.com',
          status: 'active',
          ...overrides.client,
        })
  return Invoice.create({
    organizationId: org.id,
    clientId: client?.id ?? null,
    kind: 'invoice',
    number: `FAC-${Math.floor(Math.random() * 1_000_000)}`,
    clientName: 'Alice Martin',
    status: overrides.status ?? 'overdue',
    issuedAt: reference.minus({ days: daysLate + 30 }),
    dueAt: reference.minus({ days: daysLate }).startOf('day'),
    subtotal: '100.00',
    taxRate: '20.00',
    taxAmount: '20.00',
    total: '120.00',
    currency: 'EUR',
    lastReminderTier: overrides.lastReminderTier ?? 0,
    remindersDisabled: overrides.remindersDisabled ?? false,
  })
}

async function runDaily() {
  const service = await app.container.make(InvoiceReminderService)
  return service.runDaily(TODAY)
}

test.group('SendInvoiceReminders (cron 06:30)', (group) => {
  group.each.setup(() => {
    mail.fake()
    return () => mail.restore()
  })

  test('the job delegates to the reminder service', async ({ assert }) => {
    const org = await remindersOrg()
    const invoice = await overdueInvoice(org, 5, {
      reference: DateTime.now().setZone('Europe/Paris'),
    })

    const job = await app.container.make(SendInvoiceReminders)
    await job.execute()

    const reloaded = await Invoice.findOrFail(invoice.id)
    assert.isAtLeast(reloaded.lastReminderTier, 1)
  })

  test('an invoice 3 days late gets the first reminder, by e-mail with the PDF', async ({
    assert,
  }) => {
    const { messages } = mail.fake()
    const org = await remindersOrg()
    const invoice = await overdueInvoice(org, 3)

    const result = await runDaily()

    assert.deepEqual(result, { sent: 1, skipped: 0 })
    messages.assertSentCount(1)
    const [sent] = messages.sent()
    assert.isTrue(sent.hasTo('alice@example.com'))
    assert.include(sent.toObject().message.subject as string, invoice.number)

    const reloaded = await Invoice.findOrFail(invoice.id)
    assert.equal(reloaded.reminderCount, 1)
    assert.equal(reloaded.lastReminderTier, 1)
    assert.isNotNull(reloaded.lastReminderAt)

    const reminder = await InvoiceReminder.findByOrFail('invoiceId', invoice.id)
    assert.equal(reminder.tier, 1)
    assert.equal(reminder.trigger, 'automatic')
    assert.equal(reminder.outcome, 'sent')

    const dedup = await QueueDedupKey.findByOrFail('key', `invoice_reminder:${invoice.id}:1`)
    assert.equal(dedup.jobName, 'SendInvoiceReminderEmail')

    const audit = await AuditLog.query()
      .where('action', 'invoice.reminder_sent')
      .where('entityId', invoice.id)
      .firstOrFail()
    assert.isNull(audit.userId)

    const notification = await Notification.query()
      .where('organizationId', org.id)
      .where('type', 'invoice.reminder_sent')
      .firstOrFail()
    assert.equal(notification.actionUrl, `/invoices/${invoice.id}`)
  })

  test('before J+3 nothing is sent', async ({ assert }) => {
    const { messages } = mail.fake()
    const org = await remindersOrg()
    await overdueInvoice(org, 2)

    assert.deepEqual(await runDaily(), { sent: 0, skipped: 0 })
    messages.assertNoneSent()
  })

  test('a tier is sent once: the second run the same day does nothing', async ({ assert }) => {
    const { messages } = mail.fake()
    const org = await remindersOrg()
    const invoice = await overdueInvoice(org, 12, { lastReminderTier: 1 })

    await runDaily()
    await runDaily()

    messages.assertSentCount(1)
    const reloaded = await Invoice.findOrFail(invoice.id)
    assert.equal(reloaded.lastReminderTier, 2)
    assert.equal(reloaded.reminderCount, 1)
  })

  test('an invoice found 40 days late gets the final reminder only, with the penalty notice', async ({
    assert,
  }) => {
    const { messages } = mail.fake()
    const org = await remindersOrg({ penalty: 'Pénalités de retard : 10 %.' })
    const invoice = await overdueInvoice(org, 40)

    await runDaily()

    messages.assertSentCount(1)
    const [sent] = messages.sent()
    assert.include(sent.toObject().message.text as string, 'Pénalités de retard : 10 %.')
    const reloaded = await Invoice.findOrFail(invoice.id)
    assert.equal(reloaded.lastReminderTier, 3)
  })

  test('nothing is sent when the organization has not turned reminders on', async ({ assert }) => {
    const { messages } = mail.fake()
    const org = await remindersOrg({ enabled: false })
    await overdueInvoice(org, 5)

    assert.deepEqual(await runDaily(), { sent: 0, skipped: 0 })
    messages.assertNoneSent()
  })

  test('nothing is sent once the invoicing module is gone', async ({ assert }) => {
    const { messages } = mail.fake()
    const org = await remindersOrg({ plan: 'starter' })
    await overdueInvoice(org, 5)

    assert.deepEqual(await runDaily(), { sent: 0, skipped: 0 })
    messages.assertNoneSent()
  })

  test('an invoice marked « stop reminding » and a paid one are left alone', async ({ assert }) => {
    const { messages } = mail.fake()
    const org = await remindersOrg()
    await overdueInvoice(org, 5, { remindersDisabled: true })
    await overdueInvoice(org, 5, { status: 'paid' })

    assert.deepEqual(await runDaily(), { sent: 0, skipped: 0 })
    messages.assertNoneSent()
  })

  for (const [label, client, reason] of [
    ['without e-mail', { email: null }, 'no_email'],
    ['blacklisted', { status: 'blacklisted' as const }, 'blacklisted'],
    ['anonymized', { anonymizedAt: DateTime.now() }, 'anonymized'],
    ['missing', null, 'no_client'],
  ] as const) {
    test(`a client ${label} is never written to: the organization is told instead`, async ({
      assert,
    }) => {
      const { messages } = mail.fake()
      const org = await remindersOrg()
      const invoice = await overdueInvoice(org, 5, { client })

      assert.deepEqual(await runDaily(), { sent: 0, skipped: 1 })
      messages.assertNoneSent()

      const reminder = await InvoiceReminder.findByOrFail('invoiceId', invoice.id)
      assert.equal(reminder.outcome, 'skipped')
      assert.equal(reminder.skipReason, reason)

      const reloaded = await Invoice.findOrFail(invoice.id)
      assert.equal(reloaded.reminderCount, 0)
      assert.equal(reloaded.lastReminderTier, 1)

      const notification = await Notification.query()
        .where('organizationId', org.id)
        .where('type', 'invoice.reminder_skipped')
        .firstOrFail()
      assert.equal(notification.severity, 'warning')

      // Le palier est consommé : pas de nouvelle notification le lendemain.
      const service = await app.container.make(InvoiceReminderService)
      await service.runDaily(TODAY.plus({ days: 1 }))
      const count = await Notification.query()
        .where('organizationId', org.id)
        .where('type', 'invoice.reminder_skipped')
      assert.lengthOf(count, 1)
    })
  }
})
