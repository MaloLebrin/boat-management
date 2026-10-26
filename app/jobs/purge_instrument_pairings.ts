import InstrumentPairingService from '#services/instrument_pairing_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

/**
 * Purge quotidienne des appairages de boîtier Signal K expirés (#1032) : codes
 * jamais saisis, ou livrés — dans les deux cas la ligne est morte. La route de
 * création est publique, la table ne doit pas grossir indéfiniment.
 */
@inject()
export default class PurgeInstrumentPairings extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 2,
  }

  constructor(private pairingService: InstrumentPairingService) {
    super()
  }

  async execute() {
    const deleted = await this.pairingService.purgeExpired()
    logger.info({ deleted }, 'PurgeInstrumentPairings: purge complete')
  }

  async failed(error: Error) {
    logger.error({ error }, 'PurgeInstrumentPairings: job failed')
  }
}
