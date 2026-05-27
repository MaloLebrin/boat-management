import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import AiService, { type AiChatMessage } from '#services/ai_service'
import QueueDedupService from '#services/queue_dedup_service'
import { createHash } from 'node:crypto'
import { inject } from '@adonisjs/core'

export interface RunAiChatPayload {
  messages: AiChatMessage[]
  dedupKey: string
  correlationId?: string
}

@inject()
export default class RunAiChat extends Job<RunAiChatPayload> {
  static options: JobOptions = {
    queue: 'ai',
    maxRetries: 3,
  }

  constructor(
    private dedupService: QueueDedupService,
    private aiService: AiService
  ) {
    super()
  }

  static dedupKey(options: { userId: number; messages: AiChatMessage[]; correlationId?: string }) {
    if (options.correlationId) return `ai_chat:${options.userId}:${options.correlationId}`
    const hash = createHash('sha256').update(JSON.stringify(options.messages)).digest('hex')
    return `ai_chat:${options.userId}:${hash}`
  }

  async execute() {
    await this.dedupService.markRunning(this.payload.dedupKey)

    const content = await this.aiService.chat(this.payload.messages)

    logger.info(
      {
        correlationId: this.payload.correlationId,
        outputLength: content.length,
      },
      'AI chat completed'
    )

    await this.dedupService.markCompleted(this.payload.dedupKey)
  }

  async failed(error: Error) {
    await this.dedupService.markFailed(this.payload.dedupKey, error)
    logger.error({ err: error, correlationId: this.payload.correlationId }, 'AI chat job failed')
  }
}
