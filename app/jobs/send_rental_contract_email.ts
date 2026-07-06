import edge from 'edge.js'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import app from '@adonisjs/core/services/app'
import i18nManager from '@adonisjs/i18n/services/main'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import { inject } from '@adonisjs/core'
import QueueDedupService from '#services/queue_dedup_service'
import RentalContractPdfService from '#services/rental_contract_pdf_service'
import RentalContract from '#models/rental_contract'
import Organization from '#models/organization'
import env from '#start/env'

export interface SendRentalContractEmailPayload {
  contractId: number
  organizationId: number
  to: string
  locale: string
  dedupKey: string
}

@inject()
export default class SendRentalContractEmail extends Job<SendRentalContractEmailPayload> {
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

    const contract = await RentalContract.query()
      .where('id', this.payload.contractId)
      .where('organizationId', this.payload.organizationId)
      .preload('reservation', (q) => q.preload('boat'))
      .preload('client')
      .firstOrFail()

    const i18n = i18nManager.locale(this.payload.locale)

    const pdfService = await app.container.make(RentalContractPdfService)
    const { buffer, filename } = await pdfService.generate(contract, org, i18n)

    const isFr = this.payload.locale === 'fr'
    const boatName = contract.reservation.boat.name

    const fromAddress = env.get('MAIL_FROM_ADDRESS')
    const fromName = env.get('MAIL_FROM_NAME')

    const subject = isFr
      ? `Contrat de location — ${boatName} — ${org.name}`
      : `Rental contract — ${boatName} — ${org.name}`

    const text = isFr
      ? `Bonjour,\n\nVeuillez trouver ci-joint le contrat de location pour ${boatName}.\n\nCordialement,\n${org.name}`
      : `Hello,\n\nPlease find attached the rental contract for ${boatName}.\n\nBest regards,\n${org.name}`

    const html = await edge.render('emails/rental_contract', {
      isFr,
      boatName,
      orgName: org.name,
      appUrl: env.get('APP_URL'),
    })

    await mail.send((message) => {
      message.to(this.payload.to)
      message.from(fromAddress, fromName)
      message.subject(subject)
      message.text(text)
      message.html(html)
      message.attachData(buffer, {
        filename,
        contentType: 'application/pdf',
      })
    })

    await this.dedupService.markCompleted(this.payload.dedupKey)

    logger.info(
      { contractId: this.payload.contractId, to: this.payload.to },
      'Rental contract email sent successfully'
    )
  }

  async failed(error: Error) {
    await this.dedupService.markFailed(this.payload.dedupKey, error)
    logger.error(
      { err: error, contractId: this.payload.contractId, to: this.payload.to },
      'Rental contract email job failed'
    )
  }
}
