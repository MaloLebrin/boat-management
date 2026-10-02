import MooringContractService from '#services/mooring_contract_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import i18nManager from '@adonisjs/i18n/services/main'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import { DateTime } from 'luxon'

/**
 * Facturation périodique des contrats d'amarrage (#891) : chaque matin, une
 * facture en brouillon par échéance arrivée — l'exploitant la relit et
 * l'envoie. Libellés dans la locale par défaut, comme les relances (#878).
 */
@inject()
export default class GenerateMooringContractInvoices extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 2,
  }

  constructor(private mooringContractService: MooringContractService) {
    super()
  }

  async execute() {
    logger.info('GenerateMooringContractInvoices: starting run')
    const today = DateTime.now().setZone('Europe/Paris').toISODate()!
    const created = await this.mooringContractService.invoiceDueContracts(
      today,
      i18nManager.locale(i18nManager.defaultLocale)
    )
    logger.info({ created }, 'GenerateMooringContractInvoices: run complete')
  }

  async failed(error: Error) {
    logger.error({ error }, 'GenerateMooringContractInvoices: job failed')
  }
}
