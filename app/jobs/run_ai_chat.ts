import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import AiService, { type AiChatMessage } from '#services/ai_service'
import QueueDedupService from '#services/queue_dedup_service'
import { createHash } from 'node:crypto'

export interface RunAiChatPayload {
  messages: AiChatMessage[]
  dedupKey: string
  correlationId?: string
}

export default class RunAiChat extends Job<RunAiChatPayload> {
  static options: JobOptions = {
    queue: 'ai',
    maxRetries: 3,
  }

  static dedupKey(options: { userId: number; messages: AiChatMessage[]; correlationId?: string }) {
    if (options.correlationId) return `ai_chat:${options.userId}:${options.correlationId}`
    const hash = createHash('sha256').update(JSON.stringify(options.messages)).digest('hex')
    return `ai_chat:${options.userId}:${hash}`
  }

  async execute() {
    const dedup = new QueueDedupService()
    await dedup.markRunning(this.payload.dedupKey)

    const ai = new AiService()
    const content = await ai.chat(this.payload.messages)

    logger.info(
      {
        correlationId: this.payload.correlationId,
        outputLength: content.length,
      },
      'AI chat completed'
    )

    await dedup.markCompleted(this.payload.dedupKey)
  }

  async failed(error: Error) {
    const dedup = new QueueDedupService()
    await dedup.markFailed(this.payload.dedupKey, error)
    logger.error({ err: error, correlationId: this.payload.correlationId }, 'AI chat job failed')
  }
}
