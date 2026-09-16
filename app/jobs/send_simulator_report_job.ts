import edge from 'edge.js'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import i18nManager from '@adonisjs/i18n/services/main'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import SimulatorLead from '#models/simulator_lead'
import SendEmail, { type SendEmailPayload } from '#jobs/send_email'
import QueueDedupService from '#services/queue_dedup_service'
import { formatCurrency } from '#shared/helpers/number_format'
import type {
  SimulatorBoatInput,
  SimulatorBoatType,
  SimulatorWearLevel,
  SimulatorWinteringZone,
} from '#shared/types/simulator'
import env from '#start/env'
import { computeSimulatorCosts } from '#shared/simulator_costs'

interface Payload {
  leadId: string
}

/**
 * Rapport d'estimation envoyé après une simulation publique. Sujet, texte,
 * libellés de catégories et montants suivent la langue du lead via `i18n` ;
 * le gabarit Edge garde sa bascule `isFr` interne.
 */
@inject()
export default class SendSimulatorReportJob extends Job<Payload> {
  static options: JobOptions = {
    queue: 'emails',
    maxRetries: 3,
  }

  constructor(private dedup: QueueDedupService) {
    super()
  }

  async execute() {
    const lead = await SimulatorLead.find(this.payload.leadId)
    if (!lead) {
      logger.warn({ leadId: this.payload.leadId }, 'SendSimulatorReportJob: lead not found')
      return
    }

    const i18n = i18nManager.locale(lead.locale)
    const isFr = lead.locale === 'fr'
    const boatType = lead.boatType as SimulatorBoatType

    const input: SimulatorBoatInput = {
      boatType,
      lengthM: lead.lengthM,
      yearBuilt: 2010,
      navigationCategory: 'B',
      hasDedicatedEngine: boatType === 'motorboat' || boatType === 'rib',
      hullWear: (lead.hullWear as SimulatorWearLevel) ?? 'good',
      engineWear: lead.engineWear as SimulatorWearLevel | null,
      safetyWear: (lead.safetyWear as SimulatorWearLevel) ?? 'good',
      riggingWear: lead.riggingWear as SimulatorWearLevel | null,
      winteringZone: (lead.winteringZone as SimulatorWinteringZone | null) ?? undefined,
    }

    const breakdown = computeSimulatorCosts(input)
    const money = (value: number) => formatCurrency(value, lead.locale, { fractionDigits: 0 })
    const appUrl = env.get('APP_URL')

    const totalMinFormatted = money(breakdown.totalMin)
    const totalMaxFormatted = money(breakdown.totalMax)

    const subject = i18n.t('marketing.emails.simulatorReport.subject')
    const text = i18n.t('marketing.emails.simulatorReport.text', {
      totalMin: totalMinFormatted,
      totalMax: totalMaxFormatted,
      signupUrl: `${appUrl}/signup`,
    })

    const categories = breakdown.categories.map((cat) => ({
      key: cat.key,
      label: i18n.t(`marketing.emails.simulatorReport.categories.${cat.key}`),
      minFormatted: money(cat.minCost),
      maxFormatted: money(cat.maxCost),
    }))

    const html = await edge.render('emails/simulator_report', {
      isFr,
      categories,
      totalMinFormatted,
      totalMaxFormatted,
      appUrl,
    })

    const partialPayload: Omit<SendEmailPayload, 'dedupKey'> = {
      to: lead.email,
      subject,
      text,
      html,
      correlationId: `simulator-report:${lead.email}`,
    }

    const key = SendEmail.dedupKey(partialPayload)
    const emailPayload: SendEmailPayload = { ...partialPayload, dedupKey: key }

    await this.dedup.enqueueUnique({
      key,
      jobName: SendEmail.name,
      queue: 'emails',
      payload: emailPayload,
      dispatch: async (p) => {
        await SendEmail.dispatch(p)
      },
    })
  }
}
