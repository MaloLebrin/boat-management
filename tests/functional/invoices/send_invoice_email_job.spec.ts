import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import mail from '@adonisjs/mail/services/main'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import { UserFactory } from '#database/factories/user_factory'
import OrganizationMembership from '#models/organization_membership'
import Client from '#models/client'
import Invoice from '#models/invoice'
import InvoiceLine from '#models/invoice_line'
import QueueDedupService from '#services/queue_dedup_service'
import SendInvoiceEmail, { type SendInvoiceEmailPayload } from '#jobs/send_invoice_email'

async function createEnterpriseOrgUser() {
  const user = await UserFactory.with('organization', 1, (org) =>
    org.merge({ plan: 'enterprise' })
  ).create()
  if (user.organizationId) {
    await OrganizationMembership.create({
      userId: user.id,
      organizationId: user.organizationId,
      role: 'admin',
    })
  }
  return user
}

test.group('SendInvoiceEmail job', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('generates the PDF and sends an email with a PDF attachment', async ({ assert }) => {
    // Callback-based `mail.send((message) => …)` is tracked in the `messages`
    // collection (the `mails` collection only captures class-based BaseMail).
    const { messages } = mail.fake()

    const user = await createEnterpriseOrgUser()
    const orgId = user.organizationId!
    const c = await Client.create({
      organizationId: orgId,
      firstName: 'Alice',
      lastName: 'Martin',
      email: 'alice@example.com',
      status: 'active',
    })
    const invoice = await Invoice.create({
      organizationId: orgId,
      clientId: c.id,
      kind: 'invoice',
      number: 'FAC-000001',
      clientName: 'Alice Martin',
      status: 'sent',
      issuedAt: DateTime.fromISO('2026-07-05'),
      subtotal: '100.00',
      taxRate: '20.00',
      taxAmount: '20.00',
      total: '120.00',
      currency: 'EUR',
    })
    await InvoiceLine.create({
      invoiceId: invoice.id,
      label: 'Location',
      quantity: '1',
      unitPrice: '100.00',
      amount: '100.00',
      position: 0,
    })

    const payload: SendInvoiceEmailPayload = {
      invoiceId: invoice.id,
      organizationId: orgId,
      to: 'alice@example.com',
      locale: 'en',
      dedupKey: 'test-dedup-key',
    }

    // `payload` is a getter on the base Job; subclass to inject it. markRunning/
    // markCompleted are no-op UPDATEs when the dedup key row is absent.
    class TestSendInvoiceEmail extends SendInvoiceEmail {
      get payload(): SendInvoiceEmailPayload {
        return payload
      }
    }
    const dedup = await app.container.make(QueueDedupService)
    const job = new TestSendInvoiceEmail(dedup)

    await job.execute()

    messages.assertSentCount(1)
    messages.assertSent((message) => message.hasTo('alice@example.com'))

    // `attachData` attachments only live in the nodemailer message object, so
    // inspect it directly to confirm the generated PDF is attached.
    const [sent] = messages.sent()
    const node = sent.toObject().message as {
      attachments?: Array<{ contentType?: string; filename?: string }>
    }
    const pdf = node.attachments?.find((a) => a.contentType === 'application/pdf')
    assert.exists(pdf, 'expected a PDF attachment on the sent email')
    assert.match(pdf!.filename ?? '', /\.pdf$/)
  })
})
