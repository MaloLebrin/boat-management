import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import mail from '@adonisjs/mail/services/main'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import Client from '#models/client'
import Invoice from '#models/invoice'
import Organization from '#models/organization'
import QueueDedupService from '#services/queue_dedup_service'
import SendInvoiceReminderEmail, {
  type SendInvoiceReminderEmailPayload,
} from '#jobs/send_invoice_reminder_email'
import { createEnterpriseAdminUser } from '#tests/functional/helpers'

/** E-mail de relance d'une facture en retard (#878). */

async function setup(
  options: { status?: Invoice['status']; message?: string; penalty?: string } = {}
) {
  const user = await createEnterpriseAdminUser()
  const org = await Organization.findOrFail(user.organizationId)
  org.invoiceReminderMessage = options.message ?? null
  org.invoiceLatePenaltyNote = options.penalty ?? null
  await org.save()

  const client = await Client.create({
    organizationId: org.id,
    firstName: 'Alice',
    lastName: 'Martin',
    email: 'alice@example.com',
    status: 'active',
  })
  const invoice = await Invoice.create({
    organizationId: org.id,
    clientId: client.id,
    kind: 'invoice',
    number: 'FAC-000042',
    clientName: 'Alice Martin',
    status: options.status ?? 'overdue',
    issuedAt: DateTime.fromISO('2026-07-05'),
    dueAt: DateTime.fromISO('2026-08-05'),
    subtotal: '100.00',
    taxRate: '20.00',
    taxAmount: '20.00',
    total: '120.00',
    currency: 'EUR',
  })
  return { org, invoice }
}

async function run(payload: SendInvoiceReminderEmailPayload) {
  class TestJob extends SendInvoiceReminderEmail {
    get payload(): SendInvoiceReminderEmailPayload {
      return payload
    }
  }
  const job = new TestJob(await app.container.make(QueueDedupService))
  await job.execute()
}

test.group('SendInvoiceReminderEmail job', (group) => {
  group.each.setup(() => truncateDb())

  test('first reminder: polite subject, balance due, custom message and PDF attached', async ({
    assert,
  }) => {
    const { messages } = mail.fake()
    const { org, invoice } = await setup({ message: 'Appelez-nous au 02 00 00 00 00.' })

    await run({
      invoiceId: invoice.id,
      organizationId: org.id,
      to: 'alice@example.com',
      locale: 'fr',
      tier: 1,
      dedupKey: 'test-reminder',
    })

    messages.assertSentCount(1)
    const [sent] = messages.sent()
    assert.isTrue(sent.hasTo('alice@example.com'))
    const node = sent.toObject().message as {
      subject: string
      text: string
      html: string
      attachments?: Array<{ filename?: string; contentType?: string }>
    }
    assert.equal(node.subject, `Rappel : facture FAC-000042 de ${org.name}`)
    assert.include(node.text, 'Appelez-nous au 02 00 00 00 00.')
    assert.include(node.text, '120,00')
    assert.include(node.html, 'Rappel de paiement')
    assert.equal(node.attachments?.[0]?.contentType, 'application/pdf')
  })

  test('the penalty notice only rides the final reminder', async ({ assert }) => {
    const { messages } = mail.fake()
    const { org, invoice } = await setup({ penalty: 'Indemnité forfaitaire de 40 €.' })
    const base = {
      invoiceId: invoice.id,
      organizationId: org.id,
      to: 'alice@example.com',
      locale: 'en',
    }

    await run({ ...base, tier: 2, dedupKey: 'tier-2' })
    await run({ ...base, tier: 3, dedupKey: 'tier-3' })

    const [second, final] = messages
      .sent()
      .map((m) => m.toObject().message as { text: string; subject: string })
    assert.notInclude(second.text, 'Indemnité forfaitaire')
    assert.include(final.text, 'Indemnité forfaitaire de 40 €.')
    assert.equal(final.subject, `Final reminder: invoice FAC-000042 from ${org.name}`)
  })

  test('an invoice paid since the reminder was queued is not reminded', async () => {
    const { messages } = mail.fake()
    const { org, invoice } = await setup({ status: 'paid' })

    await run({
      invoiceId: invoice.id,
      organizationId: org.id,
      to: 'alice@example.com',
      locale: 'fr',
      tier: 1,
      dedupKey: 'paid',
    })

    messages.assertNoneSent()
  })
})
