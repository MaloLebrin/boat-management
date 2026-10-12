import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import { inject } from '@adonisjs/core'
import Organization from '#models/organization'
import { BrandingService } from '#services/branding_service'
import FleetDigestMailService from '#services/fleet_digest_mail_service'
import FleetDigestService from '#services/fleet_digest_service'
import FleetReportPdfService from '#services/fleet_report_pdf_service'
import QueueDedupService from '#services/queue_dedup_service'
import type { SendMonthlyFleetReportPayload } from '#shared/types/fleet_digest'
import env from '#start/env'

/**
 * Envoi d'un rapport mensuel de flotte (#871) : e-mail dans la langue du
 * destinataire et PDF joint, générés à l'exécution à partir du rapport figé
 * dans le payload — un nouvel essai renvoie exactement les mêmes chiffres.
 */
@inject()
export default class SendMonthlyFleetReportEmail extends Job<SendMonthlyFleetReportPayload> {
  static options: JobOptions = {
    queue: 'emails',
    maxRetries: 5,
  }

  constructor(
    private dedupService: QueueDedupService,
    private mailService: FleetDigestMailService,
    private pdfService: FleetReportPdfService,
    private brandingService: BrandingService,
    private digestService: FleetDigestService
  ) {
    super()
  }

  async execute() {
    const { report, userId, to, name, locale, dedupKey } = this.payload
    await this.dedupService.markRunning(dedupKey)

    const org = await Organization.findOrFail(report.organization.id)
    const rendered = await this.mailService.renderMonthly(report, {
      to,
      name,
      locale,
      branding: this.brandingService.toEmailParams(org),
      unsubscribeUrl: this.digestService.unsubscribeUrl(userId, 'monthly'),
    })
    const pdf = await this.pdfService.generate(report, org, this.mailService.i18nFor(locale))

    await mail.send((message) => {
      message.to(to)
      message.from(env.get('MAIL_FROM_ADDRESS'), env.get('MAIL_FROM_NAME'))
      message.subject(rendered.subject)
      message.text(rendered.text)
      message.html(rendered.html)
      message.attachData(pdf.buffer, { filename: pdf.filename, contentType: 'application/pdf' })
    })

    await this.dedupService.markCompleted(dedupKey)
    logger.info(
      { organizationId: report.organization.id, month: report.month, to },
      'Monthly fleet report sent'
    )
  }

  async failed(error: Error) {
    await this.dedupService.markFailed(this.payload.dedupKey, error)
    logger.error(
      { err: error, organizationId: this.payload.report.organization.id, to: this.payload.to },
      'Monthly fleet report email failed'
    )
  }
}
