import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import { createHash } from 'node:crypto'
import QueueDedupService from '#services/queue_dedup_service'

export interface SendEmailPayload {
  to: string
  subject: string
  text: string
  correlationId?: string
  dedupKey: string
}

export default class SendEmail extends Job<SendEmailPayload> {
  static options: JobOptions = {
    queue: 'emails',
    maxRetries: 5,
  }

  static dedupKey(payload: Omit<SendEmailPayload, 'dedupKey'>) {
    if (payload.correlationId) return `email:${payload.to}:${payload.correlationId}`
    const hash = createHash('sha256').update(`${payload.subject}\n${payload.text}`).digest('hex')
    return `email:${payload.to}:${hash}`
  }

  async execute() {
    const dedup = new QueueDedupService()
    await dedup.markRunning(this.payload.dedupKey)

    // Placeholder until a mailer provider is introduced.
    logger.info(
      {
        to: this.payload.to,
        subject: this.payload.subject,
        correlationId: this.payload.correlationId,
      },
      'Email job placeholder executed'
    )

    await dedup.markCompleted(this.payload.dedupKey)
  }

  async failed(error: Error) {
    const dedup = new QueueDedupService()
    await dedup.markFailed(this.payload.dedupKey, error)
  }
}
