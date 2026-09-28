import InvoiceReminderService from '#services/invoice_reminder_service'
import InvoiceService from '#services/invoice_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

@inject()
export default class MarkOverdueInvoices extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 2,
  }

  constructor(
    private invoiceService: InvoiceService,
    private invoiceReminderService: InvoiceReminderService
  ) {
    super()
  }

  async execute() {
    logger.info('MarkOverdueInvoices: starting run')
    const flagged = await this.invoiceService.flagOverdueInvoices()
    // L'organisation apprend le jour même qu'une facture est en retard (#878).
    await this.invoiceReminderService.notifyOverdue(flagged)
    logger.info({ updated: flagged.length }, 'MarkOverdueInvoices: run complete')
  }

  async failed(error: Error) {
    logger.error({ error }, 'MarkOverdueInvoices: job failed')
  }
}
