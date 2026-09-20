import ContactMessageService from '#services/contact_message_service'
import SimulatorLeadService from '#services/simulator_lead_service'
import SimulatorShareService from '#services/simulator_share_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

/**
 * Purge des données collectées sur les pages publiques (#775).
 *
 * Messages de contact, leads du simulateur et liens de partage sont écrits
 * **sans authentification**. Les throttles de `start/limiter.ts` bornent le
 * débit — 5/10 min pour le contact et les leads, 6/min pour les partages —
 * mais pas le cumul : rien n'empêchait la croissance sur la durée, et les deux
 * premières tables portent des adresses e-mail.
 *
 * Les durées viennent de `shared/constants/data_retention.ts` et sont celles
 * qu'annonce la politique de confidentialité : les deux se lisent ensemble.
 */
@inject()
export default class PurgePublicFormData extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 2,
  }

  constructor(
    private contactMessageService: ContactMessageService,
    private simulatorLeadService: SimulatorLeadService,
    private simulatorShareService: SimulatorShareService
  ) {
    super()
  }

  async execute() {
    logger.info('PurgePublicFormData: starting purge run')

    const contactMessages = await this.contactMessageService.purgeExpired()
    const simulatorLeads = await this.simulatorLeadService.purgeExpired()
    const simulatorShares = await this.simulatorShareService.purgeExpired()

    logger.info(
      { contactMessages, simulatorLeads, simulatorShares },
      'PurgePublicFormData: purge complete'
    )
  }

  async failed(error: Error) {
    logger.error({ error }, 'PurgePublicFormData: job failed')
  }
}
