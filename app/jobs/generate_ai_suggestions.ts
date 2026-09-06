import AiProactiveSuggestionService from '#services/ai_proactive_suggestion_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

/**
 * Génération planifiée des suggestions IA (bateaux + moteurs).
 *
 * `maxRetries: 1` : un retry re-brûlerait des tokens pour les scopes déjà
 * générés — la résilience est le try/catch par entité du service, pas la
 * relance du job.
 */
@inject()
export default class GenerateAiSuggestions extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'ai',
    maxRetries: 1,
  }

  constructor(private proactiveSuggestionService: AiProactiveSuggestionService) {
    super()
  }

  async execute() {
    logger.info('GenerateAiSuggestions: starting run')
    const result = await this.proactiveSuggestionService.run()
    logger.info(result, 'GenerateAiSuggestions: run complete')
  }

  async failed(error: Error) {
    logger.error({ error }, 'GenerateAiSuggestions: job failed')
  }
}
