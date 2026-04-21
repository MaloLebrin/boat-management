import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

export interface SendEmailPayload {
  to: string
  subject: string
  text: string
  correlationId?: string
}

export default class SendEmail extends Job<SendEmailPayload> {
  static options: JobOptions = {
    queue: 'emails',
    maxRetries: 5,
  }

  async execute() {
    // Placeholder until a mailer provider is introduced.
    logger.info(
      {
        to: this.payload.to,
        subject: this.payload.subject,
        correlationId: this.payload.correlationId,
      },
      'Email job placeholder executed'
    )
  }
}
