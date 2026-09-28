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
import OnlinePaymentService from '#services/online_payment_service'
import CreditNoteService from '#services/credit_note_service'
import { BrandingService } from '#services/branding_service'
import Invoice from '#models/invoice'
import Organization from '#models/organization'
import env from '#start/env'
import { formatCurrency } from '#shared/helpers/number_format'
import { formatDateLong } from '#shared/helpers/date_format'
import { invoiceBalanceDue } from '#shared/helpers/invoice_lifecycle'
import { INVOICE_REMINDER_LAST_TIER } from '#shared/constants/invoice_reminders'

export interface SendInvoiceReminderEmailPayload {
  invoiceId: number
  organizationId: number
  to: string
  locale: string
  tier: number
  dedupKey: string
}

/**
 * Relance d'une facture en retard (#878) : un e-mail au client, facture PDF
 * jointe et lien « Payer en ligne » quand l'organisation encaisse en ligne.
 * Le ton monte d'un palier à l'autre ; le dernier porte la mention des
 * pénalités de retard réglée par l'organisation.
 */
@inject()
export default class SendInvoiceReminderEmail extends Job<SendInvoiceReminderEmailPayload> {
  static options: JobOptions = {
    queue: 'emails',
    maxRetries: 5,
  }

  constructor(private dedupService: QueueDedupService) {
    super()
  }

  async execute() {
    await this.dedupService.markRunning(this.payload.dedupKey)

    const org = await Organization.findOrFail(this.payload.organizationId)
    const invoice = await Invoice.query()
      .where('id', this.payload.invoiceId)
      .where('organizationId', this.payload.organizationId)
      .preload('lines', (q) => q.orderBy('position'))
      .preload('client')
      .firstOrFail()

    // Réglée entre la mise en file et l'envoi : on ne relance pas un client
    // qui vient de payer.
    if (invoice.status === 'paid' || invoice.status === 'credited') {
      await this.dedupService.markCompleted(this.payload.dedupKey)
      logger.info({ invoiceId: invoice.id }, 'Invoice reminder skipped: invoice settled')
      return
    }

    const i18n = i18nManager.locale(this.payload.locale)
    const tier = Math.min(Math.max(this.payload.tier, 1), INVOICE_REMINDER_LAST_TIER)
    const isLast = tier === INVOICE_REMINDER_LAST_TIER

    const pdfService = await app.container.make(InvoicePdfService)
    const onlinePaymentService = await app.container.make(OnlinePaymentService)
    const creditNoteService = await app.container.make(CreditNoteService)
    const brandingService = await app.container.make(BrandingService)

    const paymentUrl = await onlinePaymentService.paymentUrlFor(invoice, org)
    const { buffer, filename } = await pdfService.generate(invoice, org, i18n, { paymentUrl })

    const balance = invoiceBalanceDue(invoice, await creditNoteService.creditedTotal(invoice))
    const params = {
      number: invoice.number,
      orgName: org.name,
      amount: formatCurrency(balance, i18n.locale, { currency: invoice.currency }),
      dueDate: invoice.dueAt ? formatDateLong(invoice.dueAt.toISODate()!, i18n.locale) : '—',
    }
    const message = org.invoiceReminderMessage?.trim() || null
    const penaltyNote = isLast ? org.invoiceLatePenaltyNote?.trim() || null : null

    const subject = i18n.t(`invoices.reminderEmail.subject.tier${tier}`, params)
    const text = [
      i18n.t('invoices.reminderEmail.greeting'),
      i18n.t(`invoices.reminderEmail.body.tier${tier}`, params),
      `${i18n.t('invoices.reminderEmail.balanceLabel')} ${params.amount}`,
      message,
      penaltyNote,
      paymentUrl ? i18n.t('invoices.email.payOnlineText', { url: paymentUrl }) : null,
      i18n.t('invoices.reminderEmail.alreadyPaid'),
      i18n.t('invoices.reminderEmail.signature', params),
    ]
      .filter(Boolean)
      .join('\n\n')

    const html = await edge.render('emails/invoice_reminder', {
      i18n,
      tier,
      params,
      messageLines: message ? message.split('\n') : [],
      penaltyLines: penaltyNote ? penaltyNote.split('\n') : [],
      paymentUrl,
      branding: brandingService.toEmailParams(org),
    })

    await mail.send((mailMessage) => {
      mailMessage.to(this.payload.to)
      mailMessage.from(env.get('MAIL_FROM_ADDRESS'), env.get('MAIL_FROM_NAME'))
      mailMessage.subject(subject)
      mailMessage.text(text)
      mailMessage.html(html)
      mailMessage.attachData(buffer, { filename, contentType: 'application/pdf' })
    })

    await this.dedupService.markCompleted(this.payload.dedupKey)
    logger.info({ invoiceId: invoice.id, tier }, 'Invoice reminder sent')
  }

  async failed(error: Error) {
    await this.dedupService.markFailed(this.payload.dedupKey, error)
    logger.error({ err: error, invoiceId: this.payload.invoiceId }, 'Invoice reminder job failed')
  }
}
