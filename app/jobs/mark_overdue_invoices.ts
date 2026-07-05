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

  constructor(private invoiceService: InvoiceService) {
    super()
  }

  async execute() {
    logger.info('MarkOverdueInvoices: starting run')
    const updated = await this.invoiceService.markOverdueInvoices()
    logger.info({ updated }, 'MarkOverdueInvoices: run complete')
  }

  async failed(error: Error) {
    logger.error({ error }, 'MarkOverdueInvoices: job failed')
  }
}
