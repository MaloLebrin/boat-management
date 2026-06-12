import edge from 'edge.js'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import SimulatorLead from '#models/simulator_lead'
import SendEmail, { type SendEmailPayload } from '#jobs/send_email'
import QueueDedupService from '#services/queue_dedup_service'
import env from '#start/env'

interface Payload {
  leadId: string
}

@inject()
export default class SendSimulatorNurturingJob extends Job<Payload> {
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
      logger.warn({ leadId: this.payload.leadId }, 'SendSimulatorNurturingJob: lead not found')
      return
    }

    const isFr = lead.locale === 'fr'
    const appUrl = env.get('APP_URL')

    await this.#scheduleD3(lead.email, isFr, appUrl)
    await this.#scheduleD7(lead.email, lead.totalMin, lead.totalMax, isFr, appUrl)
  }

  async #scheduleD3(email: string, isFr: boolean, appUrl: string) {
    const subject = isFr
      ? "3 conseils pour reduire les couts d'entretien de votre bateau"
      : '3 tips to reduce your boat maintenance costs'

    const text = isFr
      ? `3 conseils pour reduire vos couts d'entretien bateau\n\nCreez votre compte: ${appUrl}/signup`
      : `3 tips to reduce your boat maintenance costs\n\nCreate your account: ${appUrl}/signup`

    const tips = isFr
      ? [
          {
            title: 'Anticipez les petites reparations',
            body: "Une reparation mineure negligee peut rapidement devenir une facture importante. Inspectez regulierement votre bateau pour detecter les problemes avant qu'ils ne s'aggravent.",
          },
          {
            title: 'Comparez plusieurs devis',
            body: "Ne vous contentez pas du premier devis. Demandez au moins 2 ou 3 estimations pour les travaux importants afin d'obtenir le meilleur rapport qualite-prix.",
          },
          {
            title: 'Hivernez votre bateau correctement',
            body: "Un hivernage bien fait protege votre bateau du gel, de l'humidite et de la corrosion. Investir dans un bon hivernage, c'est economiser sur les reparations au printemps.",
          },
        ]
      : [
          {
            title: 'Anticipate small repairs',
            body: 'A neglected minor repair can quickly become a major expense. Regularly inspect your boat to catch problems before they worsen.',
          },
          {
            title: 'Compare multiple quotes',
            body: "Don't settle for the first quote. Request at least 2 or 3 estimates for major work to get the best value for your money.",
          },
          {
            title: 'Winter your boat properly',
            body: 'Proper winterization protects your boat from frost, humidity, and corrosion. Investing in good winterization saves on spring repairs.',
          },
        ]

    const html = await edge.render('emails/nurturing_d3', { isFr, tips, appUrl })

    const partialPayload: Omit<SendEmailPayload, 'dedupKey'> = {
      to: email,
      subject,
      text,
      html,
      correlationId: `simulator-nurture-d3:${email}`,
    }

    const key = `simulator-nurture-d3:${email}`
    const emailPayload: SendEmailPayload = { ...partialPayload, dedupKey: key }

    await this.dedup.enqueueUnique({
      key,
      jobName: SendEmail.name,
      queue: 'emails',
      payload: emailPayload,
      dispatch: async (p) => {
        await SendEmail.dispatch(p).in('3d')
      },
    })
  }

  async #scheduleD7(
    email: string,
    totalMin: number,
    totalMax: number,
    isFr: boolean,
    appUrl: string
  ) {
    const formatter = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    })

    const totalMinFormatted = formatter.format(totalMin)
    const totalMaxFormatted = formatter.format(totalMax)

    const subject = isFr
      ? "Votre estimation d'entretien bateau — toujours disponible"
      : 'Your boat maintenance estimate — still available'

    const text = isFr
      ? `Votre bateau vous coutera entre ${totalMinFormatted} et ${totalMaxFormatted} par an en entretien. FleetAi vous aide a planifier et anticiper ces depenses.\n\nCreez votre compte: ${appUrl}/signup`
      : `Your boat will cost between ${totalMinFormatted} and ${totalMaxFormatted} per year in maintenance. FleetAi helps you plan and anticipate these expenses.\n\nCreate your account: ${appUrl}/signup`

    const html = await edge.render('emails/nurturing_d7', {
      isFr,
      totalMin: totalMinFormatted,
      totalMax: totalMaxFormatted,
      appUrl,
    })

    const partialPayload: Omit<SendEmailPayload, 'dedupKey'> = {
      to: email,
      subject,
      text,
      html,
      correlationId: `simulator-nurture-d7:${email}`,
    }

    const key = `simulator-nurture-d7:${email}`
    const emailPayload: SendEmailPayload = { ...partialPayload, dedupKey: key }

    await this.dedup.enqueueUnique({
      key,
      jobName: SendEmail.name,
      queue: 'emails',
      payload: emailPayload,
      dispatch: async (p) => {
        await SendEmail.dispatch(p).in('7d')
      },
    })
  }
}
