import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import { createHash } from 'node:crypto'
import QueueDedupService from '#services/queue_dedup_service'
import env from '#start/env'

export interface SendEmailPayload {
  to: string
  subject: string
  text: string
  html?: string
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

    const fromAddress = env.get('MAIL_FROM_ADDRESS')
    const fromName = env.get('MAIL_FROM_NAME')

    await mail.send((message) => {
      message.to(this.payload.to)
      message.from(fromAddress, fromName)
      message.subject(this.payload.subject)
      message.text(this.payload.text)

      if (this.payload.html) {
        message.html(this.payload.html)
      }
    })

    await dedup.markCompleted(this.payload.dedupKey)

    logger.info(
      {
        to: this.payload.to,
        subject: this.payload.subject,
        correlationId: this.payload.correlationId,
      },
      'Email sent successfully'
    )
  }

  async failed(error: Error) {
    const dedup = new QueueDedupService()
    await dedup.markFailed(this.payload.dedupKey, error)
  }
}
