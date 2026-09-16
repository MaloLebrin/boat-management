import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import mail from '@adonisjs/mail/services/main'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import Client from '#models/client'
import Invoice from '#models/invoice'
import Organization from '#models/organization'
import InvoiceLine from '#models/invoice_line'
import QueueDedupService from '#services/queue_dedup_service'
import SendInvoiceEmail, { type SendInvoiceEmailPayload } from '#jobs/send_invoice_email'
import { createEnterpriseAdminUser } from '#tests/functional/helpers'

test.group('SendInvoiceEmail job', (group) => {
  group.each.setup(() => truncateDb())

  test('generates the PDF and sends an email with a PDF attachment', async ({ assert }) => {
    // Callback-based `mail.send((message) => …)` is tracked in the `messages`
    // collection (the `mails` collection only captures class-based BaseMail).
    const { messages } = mail.fake()

    const user = await createEnterpriseAdminUser()
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

  test('the subject, body and amount follow the requested locale', async ({ assert }) => {
    const { messages } = mail.fake()
    const user = await createEnterpriseOrgUser()
    const orgId = user.organizationId!
    const org = await Organization.findOrFail(orgId)
    const invoice = await Invoice.create({
      organizationId: orgId,
      clientId: null,
      kind: 'invoice',
      number: 'FAC-000002',
      clientName: 'Alice Martin',
      status: 'sent',
      issuedAt: DateTime.fromISO('2026-07-05'),
      subtotal: '1000.00',
      taxRate: '20.00',
      taxAmount: '200.00',
      total: '1200.00',
      currency: 'EUR',
    })

    const send = async (locale: string) => {
      const payload: SendInvoiceEmailPayload = {
        invoiceId: invoice.id,
        organizationId: orgId,
        to: 'alice@example.com',
        locale,
        dedupKey: `test-dedup-${locale}`,
      }
      class TestSendInvoiceEmail extends SendInvoiceEmail {
        get payload(): SendInvoiceEmailPayload {
          return payload
        }
      }
      const dedup = await app.container.make(QueueDedupService)
      await new TestSendInvoiceEmail(dedup).execute()
      const sent = messages.sent().at(-1)!.toObject().message as { subject: string; text: string }
      const icuSpaces = new RegExp('[\\u00a0\\u202f]', 'g')
      return { subject: sent.subject, text: sent.text.replace(icuSpaces, ' ') }
    }

    const en = await send('en')
    assert.equal(en.subject, `Invoice FAC-000002 from ${org.name}`)
    assert.include(en.text, 'Please find attached invoice no. FAC-000002.')
    assert.include(en.text, 'Total amount: €1,200.00')

    const fr = await send('fr')
    assert.equal(fr.subject, `Facture FAC-000002 de ${org.name}`)
    assert.include(fr.text, 'Veuillez trouver ci-joint la facture n° FAC-000002.')
    assert.include(fr.text, 'Montant total : 1 200,00 €')
  })
})
