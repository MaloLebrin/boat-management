import InvoiceReminderService from '#services/invoice_reminder_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

/**
 * Relances quotidiennes des factures en retard (#878), après le passage en
 * `overdue` de 06:00. Chaque e-mail part dans sa propre tâche de la file
 * `emails`, dédupliquée par `invoice_reminder:<id>:<palier>`.
 */
@inject()
export default class SendInvoiceReminders extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 2,
  }

  constructor(private invoiceReminderService: InvoiceReminderService) {
    super()
  }

  async execute() {
    logger.info('SendInvoiceReminders: starting run')
    const result = await this.invoiceReminderService.runDaily()
    logger.info(result, 'SendInvoiceReminders: run complete')
  }

  async failed(error: Error) {
    logger.error({ error }, 'SendInvoiceReminders: job failed')
  }
}
