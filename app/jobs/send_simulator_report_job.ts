import edge from 'edge.js'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import SimulatorLead from '#models/simulator_lead'
import SendEmail, { type SendEmailPayload } from '#jobs/send_email'
import QueueDedupService from '#services/queue_dedup_service'
import type {
  SimulatorBoatInput,
  SimulatorBoatType,
  SimulatorWearLevel,
  SimulatorWinteringZone,
} from '#shared/types/simulator'
import env from '#start/env'
import { computeSimulatorCosts } from '../../shared/simulator_costs.js'

interface Payload {
  leadId: string
}

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

    const subject = isFr
      ? "Votre rapport d'entretien bateau — FleetAi"
      : 'Your boat maintenance report — FleetAi'

    const text = isFr
      ? `Votre rapport d'estimation de couts\n\nTotal: ${breakdown.totalMin} - ${breakdown.totalMax} EUR\n\nCreez votre compte: ${env.get('APP_URL')}/signup`
      : `Your cost estimation report\n\nTotal: ${breakdown.totalMin} - ${breakdown.totalMax} EUR\n\nCreate your account: ${env.get('APP_URL')}/signup`

    const categoryLabels: Record<string, string> = {
      hull: isFr ? 'Coque' : 'Hull',
      engine: isFr ? 'Moteur' : 'Engine',
      safety: isFr ? 'Securite' : 'Safety',
      electrical: isFr ? 'Electrique' : 'Electrical',
      mooring: isFr ? 'Mouillage' : 'Mooring',
      rigging: isFr ? 'Greement' : 'Rigging',
    }

    const formatter = new Intl.NumberFormat(isFr ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    })

    const categories = breakdown.categories.map((cat) => ({
      key: cat.key,
      label: categoryLabels[cat.key] ?? cat.key,
      minFormatted: formatter.format(cat.minCost),
      maxFormatted: formatter.format(cat.maxCost),
    }))

    const html = await edge.render('emails/simulator_report', {
      isFr,
      categories,
      totalMinFormatted: formatter.format(breakdown.totalMin),
      totalMaxFormatted: formatter.format(breakdown.totalMax),
      appUrl: env.get('APP_URL'),
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
