import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import AiService, { type AiChatMessage } from '#services/ai_service'

export interface RunAiChatPayload {
  messages: AiChatMessage[]
  correlationId?: string
}

export default class RunAiChat extends Job<RunAiChatPayload> {
  static options: JobOptions = {
    queue: 'ai',
    maxRetries: 3,
  }

  async execute() {
    const ai = new AiService()
    const content = await ai.chat(this.payload.messages)

    logger.info(
      {
        correlationId: this.payload.correlationId,
        outputLength: content.length,
      },
      'AI chat completed'
    )
  }

  async failed(error: Error) {
    logger.error({ err: error, correlationId: this.payload.correlationId }, 'AI chat job failed')
  }
}
