import edge from 'edge.js'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import app from '@adonisjs/core/services/app'
import i18nManager from '@adonisjs/i18n/services/main'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import { inject } from '@adonisjs/core'
import QueueDedupService from '#services/queue_dedup_service'
import InspectionDocumentService from '#services/inspection_document_service'
import BoatInspection from '#models/boat_inspection'
import Organization from '#models/organization'
import env from '#start/env'

export interface SendInspectionEmailPayload {
  inspectionId: number
  organizationId: number
  to: string
  locale: string
  dedupKey: string
}

/** Envoie au client l'état des lieux signé, PDF archivé en pièce jointe (#889). */
@inject()
export default class SendInspectionEmail extends Job<SendInspectionEmailPayload> {
  static options: JobOptions = {
    queue: 'emails',
    maxRetries: 5,
  }

  constructor(private dedupService: QueueDedupService) {
    super()
  }

  async execute() {
    await this.dedupService.markRunning(this.payload.dedupKey)

    const org = await Organization.findOrFail(this.payload.organizationId)
    const inspection = await BoatInspection.query()
      .where('id', this.payload.inspectionId)
      .where('organizationId', this.payload.organizationId)
      .preload('reservation', (query) => query.preload('boat'))
      .firstOrFail()

    const i18n = i18nManager.locale(this.payload.locale)
    const documents = await app.container.make(InspectionDocumentService)
    const { buffer, filename } = await documents.pdfFor(
      inspection,
      inspection.reservation,
      org,
      i18n
    )

    const values = {
      boatName: inspection.reservation.boat.name,
      orgName: org.name,
      kind: i18n.t(`inspections.kind.${inspection.kind}`),
    }
    const subject = i18n.t('inspections.email.subject', values)
    const text = [
      i18n.t('inspections.email.greeting'),
      i18n.t('inspections.email.body', values),
      i18n.t('inspections.email.signature', values),
    ].join('\n\n')
    const html = await edge.render('emails/inspection', { i18n, ...values })

    await mail.send((message) => {
      message.to(this.payload.to)
      message.from(env.get('MAIL_FROM_ADDRESS'), env.get('MAIL_FROM_NAME'))
      message.subject(subject)
      message.text(text)
      message.html(html)
      message.attachData(buffer, { filename, contentType: 'application/pdf' })
    })

    await this.dedupService.markCompleted(this.payload.dedupKey)
    logger.info({ inspectionId: this.payload.inspectionId }, 'inspection email sent')
  }

  async failed(error: Error) {
    await this.dedupService.markFailed(this.payload.dedupKey, error)
    logger.error(
      { err: error, inspectionId: this.payload.inspectionId },
      'inspection email job failed'
    )
  }
}
