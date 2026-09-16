import edge from 'edge.js'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import app from '@adonisjs/core/services/app'
import i18nManager from '@adonisjs/i18n/services/main'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import { inject } from '@adonisjs/core'
import QueueDedupService from '#services/queue_dedup_service'
import InvoicePdfService from '#services/invoice_pdf_service'
import Invoice from '#models/invoice'
import Organization from '#models/organization'
import env from '#start/env'
import { formatCurrency } from '#shared/helpers/number_format'

export interface SendInvoiceEmailPayload {
  invoiceId: number
  organizationId: number
  to: string
  locale: string
  dedupKey: string
}

@inject()
export default class SendInvoiceEmail extends Job<SendInvoiceEmailPayload> {
  static options: JobOptions = {
    queue: 'emails',
    maxRetries: 5,
  }

  constructor(private dedupService: QueueDedupService) {
    super()
  }

  async execute() {
    await this.dedupService.markRunning(this.payload.dedupKey)

    // Load organization
    const org = await Organization.findOrFail(this.payload.organizationId)

    // Load invoice scoped to organization with preloads
    const invoice = await Invoice.query()
      .where('id', this.payload.invoiceId)
      .where('organizationId', this.payload.organizationId)
      .preload('lines', (q) => q.orderBy('position'))
      .preload('client')
      .firstOrFail()

    // Build i18n for the requested locale
    const i18n = i18nManager.locale(this.payload.locale)

    // Resolve InvoicePdfService via the container (it uses @inject())
    const pdfService = await app.container.make(InvoicePdfService)

    // Generate PDF
    const { buffer, filename } = await pdfService.generate(invoice, org, i18n)

    // Contenu de l'email dans la langue du destinataire (sujet, texte, montant).
    // Le gabarit Edge garde sa bascule `isFr` interne.
    const isFr = this.payload.locale === 'fr'
    const kindLabel = i18n.t(`invoices.email.kind.${invoice.kind}`)
    const KindLabel = i18n.t(`invoices.email.kindTitle.${invoice.kind}`)
    const totalFormatted = formatCurrency(Number.parseFloat(invoice.total), this.payload.locale, {
      currency: invoice.currency,
    })

    const fromAddress = env.get('MAIL_FROM_ADDRESS')
    const fromName = env.get('MAIL_FROM_NAME')

    const subject = i18n.t('invoices.email.subject', {
      kindTitle: KindLabel,
      number: invoice.number,
      orgName: org.name,
    })
    const text = i18n.t('invoices.email.text', {
      kind: kindLabel,
      number: invoice.number,
      total: totalFormatted,
      orgName: org.name,
    })

    const html = await edge.render('emails/invoice', {
      isFr,
      invoiceNumber: invoice.number,
      kindLabel,
      KindLabel,
      totalFormatted,
      orgName: org.name,
      appUrl: env.get('APP_URL'),
    })

    await mail.send((message) => {
      message.to(this.payload.to)
      message.from(fromAddress, fromName)
      message.subject(subject)
      message.text(text)
      message.html(html)
      message.attachData(buffer, {
        filename,
        contentType: 'application/pdf',
      })
    })

    await this.dedupService.markCompleted(this.payload.dedupKey)

    logger.info(
      {
        invoiceId: this.payload.invoiceId,
        to: this.payload.to,
        invoiceNumber: invoice.number,
      },
      'Invoice email sent successfully'
    )
  }

  async failed(error: Error) {
    await this.dedupService.markFailed(this.payload.dedupKey, error)
    logger.error(
      { err: error, invoiceId: this.payload.invoiceId, to: this.payload.to },
      'Invoice email job failed'
    )
  }
}
