import edge from 'edge.js'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import i18nManager from '@adonisjs/i18n/services/main'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import type { I18n } from '@adonisjs/i18n'
import SimulatorLead from '#models/simulator_lead'
import SendEmail, { type SendEmailPayload } from '#jobs/send_email'
import QueueDedupService from '#services/queue_dedup_service'
import { formatCurrency } from '#shared/helpers/number_format'
import env from '#start/env'

interface Payload {
  leadId: string
}

/**
 * Relances J+3 (conseils) et J+7 (rappel de l'estimation) après une simulation
 * publique. Sujets, textes et montants suivent la langue du lead via `i18n` —
 * la relance J+7 formatait ses montants en `fr-FR` quelle que soit la langue.
 * Les gabarits Edge gardent leur bascule `isFr` interne.
 */
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

    const i18n = i18nManager.locale(lead.locale)
    const appUrl = env.get('APP_URL')

    await this.#scheduleD3(lead, i18n, appUrl)
    await this.#scheduleD7(lead, i18n, appUrl)
  }

  async #scheduleD3(lead: SimulatorLead, i18n: I18n, appUrl: string) {
    const isFr = lead.locale === 'fr'
    const signupUrl = `${appUrl}/signup`
    const subject = i18n.t('marketing.emails.nurturingD3.subject')
    const text = i18n.t('marketing.emails.nurturingD3.text', { signupUrl })
    const tips = ['1', '2', '3'].map((n) => ({
      title: i18n.t(`marketing.emails.nurturingD3.tips.${n}.title`),
      body: i18n.t(`marketing.emails.nurturingD3.tips.${n}.body`),
    }))

    const html = await edge.render('emails/nurturing_d3', { isFr, tips, appUrl })

    await this.#enqueue(lead.email, `simulator-nurture-d3:${lead.email}`, subject, text, html, '3d')
  }

  async #scheduleD7(lead: SimulatorLead, i18n: I18n, appUrl: string) {
    const isFr = lead.locale === 'fr'
    const signupUrl = `${appUrl}/signup`
    const totalMin = formatCurrency(lead.totalMin, lead.locale, { fractionDigits: 0 })
    const totalMax = formatCurrency(lead.totalMax, lead.locale, { fractionDigits: 0 })

    const subject = i18n.t('marketing.emails.nurturingD7.subject')
    const text = i18n.t('marketing.emails.nurturingD7.text', { totalMin, totalMax, signupUrl })

    const html = await edge.render('emails/nurturing_d7', { isFr, totalMin, totalMax, appUrl })

    await this.#enqueue(lead.email, `simulator-nurture-d7:${lead.email}`, subject, text, html, '7d')
  }

  async #enqueue(
    to: string,
    key: string,
    subject: string,
    text: string,
    html: string,
    delay: string
  ) {
    const partialPayload: Omit<SendEmailPayload, 'dedupKey'> = {
      to,
      subject,
      text,
      html,
      correlationId: key,
    }
    const emailPayload: SendEmailPayload = { ...partialPayload, dedupKey: key }

    await this.dedup.enqueueUnique({
      key,
      jobName: SendEmail.name,
      queue: 'emails',
      payload: emailPayload,
      dispatch: async (p) => {
        await SendEmail.dispatch(p).in(delay)
      },
    })
  }
}
