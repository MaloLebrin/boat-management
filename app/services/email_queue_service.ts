import SendEmail, { type SendEmailPayload } from '#jobs/send_email'
import type SimulatorLead from '#models/simulator_lead'
import QueueDedupService from '#services/queue_dedup_service'
import type { ReminderBoatItem, ReminderPortItem, ReminderTaskItem } from '#shared/types/reminder'
import type {
  SimulatorBoatInput,
  SimulatorBoatType,
  SimulatorWearLevel,
} from '#shared/types/simulator'
import env from '#start/env'
import { inject } from '@adonisjs/core'
import { computeSimulatorCosts } from '../../shared/simulator_costs.js'

@inject()
export default class EmailQueueService {
  constructor(private dedup: QueueDedupService) {}
  /**
   * Enqueue a welcome email for a new user.
   */
  async sendWelcome(params: { to: string; name: string | null }) {
    const displayName = params.name || params.to
    const subject = 'Bienvenue sur FleetAi / Welcome to FleetAi'
    const text = `Bonjour ${displayName},\n\nBienvenue sur FleetAi, votre plateforme de gestion de flotte.\n\nHello ${displayName},\n\nWelcome to FleetAi, your fleet management platform.\n\nAccess your dashboard: /dashboard`

    const html = this.#buildWelcomeHtml(displayName)

    const partialPayload: Omit<SendEmailPayload, 'dedupKey'> = {
      to: params.to,
      subject,
      text,
      html,
      correlationId: `welcome:${params.to}`,
    }

    const key = SendEmail.dedupKey(partialPayload)
    const payload: SendEmailPayload = { ...partialPayload, dedupKey: key }

    await this.dedup.enqueueUnique({
      key,
      jobName: SendEmail.name,
      queue: 'emails',
      payload,
      dispatch: async (p) => {
        await SendEmail.dispatch(p)
      },
    })
  }

  /**
   * Enqueue a password reset email.
   */
  async sendPasswordReset(params: { to: string; resetUrl: string }) {
    const subject = 'Reset your password / Reinitialisation de mot de passe'
    const text = `Click here to reset your password: ${params.resetUrl}\n\nCliquez ici pour reinitialiser votre mot de passe : ${params.resetUrl}`

    const html = this.#buildPasswordResetHtml(params.resetUrl)

    const partialPayload: Omit<SendEmailPayload, 'dedupKey'> = {
      to: params.to,
      subject,
      text,
      html,
      correlationId: `password-reset:${params.to}:${Date.now()}`,
    }

    const key = SendEmail.dedupKey(partialPayload)
    const payload: SendEmailPayload = { ...partialPayload, dedupKey: key }

    await this.dedup.enqueueUnique({
      key,
      jobName: SendEmail.name,
      queue: 'emails',
      payload,
      dispatch: async (p) => {
        await SendEmail.dispatch(p)
      },
    })
  }

  #buildWelcomeHtml(displayName: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to FleetAi</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <tr>
      <td style="padding:40px 30px;text-align:center;background-color:#1e3a5f;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;">FleetAi</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px;color:#333333;font-size:22px;">Bienvenue ${displayName} / Welcome ${displayName}</h2>
        <p style="margin:0 0 15px;color:#555555;font-size:16px;line-height:1.5;">
          Merci d'avoir rejoint FleetAi. Nous sommes ravis de vous accueillir sur notre plateforme de gestion de flotte.
        </p>
        <p style="margin:0 0 25px;color:#555555;font-size:16px;line-height:1.5;">
          Thank you for joining FleetAi. We are excited to have you on our fleet management platform.
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
          <tr>
            <td style="border-radius:6px;background-color:#1e3a5f;">
              <a href="/dashboard" style="display:inline-block;padding:14px 30px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">
                Go to Dashboard
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 30px;text-align:center;background-color:#f4f4f7;color:#888888;font-size:12px;">
        <p style="margin:0;">FleetAi - Boat Fleet Management</p>
      </td>
    </tr>
  </table>
</body>
</html>`
  }

  /**
   * Enqueue an organization invitation email.
   */
  async sendInvitation(params: {
    to: string
    inviterName: string | null
    orgName: string
    acceptUrl: string
  }) {
    const subject = `You've been invited to join ${params.orgName} / Vous avez ete invite a rejoindre ${params.orgName}`
    const inviterDisplay = params.inviterName ?? 'A team member'
    const text = `${inviterDisplay} has invited you to join ${params.orgName} on FleetAi.\n\nClick here to accept: ${params.acceptUrl}\n\n${inviterDisplay} vous a invite a rejoindre ${params.orgName} sur FleetAi.\n\nCliquez ici pour accepter : ${params.acceptUrl}`

    const html = this.#buildInvitationHtml(params.inviterName, params.orgName, params.acceptUrl)

    const partialPayload: Omit<SendEmailPayload, 'dedupKey'> = {
      to: params.to,
      subject,
      text,
      html,
      correlationId: `invitation:${params.to}:${Date.now()}`,
    }

    const key = SendEmail.dedupKey(partialPayload)
    const payload: SendEmailPayload = { ...partialPayload, dedupKey: key }

    await this.dedup.enqueueUnique({
      key,
      jobName: SendEmail.name,
      queue: 'emails',
      payload,
      dispatch: async (p) => {
        await SendEmail.dispatch(p)
      },
    })
  }

  #buildInvitationHtml(inviterName: string | null, orgName: string, acceptUrl: string): string {
    const inviterDisplay = inviterName ?? 'A team member'
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to ${orgName}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <tr>
      <td style="padding:40px 30px;text-align:center;background-color:#1e3a5f;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;">FleetAi</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px;color:#333333;font-size:22px;">You're Invited! / Vous etes invite !</h2>
        <p style="margin:0 0 15px;color:#555555;font-size:16px;line-height:1.5;">
          ${inviterDisplay} has invited you to join <strong>${orgName}</strong> on FleetAi.
        </p>
        <p style="margin:0 0 25px;color:#555555;font-size:16px;line-height:1.5;">
          ${inviterDisplay} vous a invite a rejoindre <strong>${orgName}</strong> sur FleetAi.
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
          <tr>
            <td style="border-radius:6px;background-color:#1e3a5f;">
              <a href="${acceptUrl}" style="display:inline-block;padding:14px 30px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">
                Accept Invitation / Accepter l'invitation
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:25px 0 0;color:#888888;font-size:14px;line-height:1.5;">
          This invitation expires in 7 days. If you did not expect this, you can safely ignore this email.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 30px;text-align:center;background-color:#f4f4f7;color:#888888;font-size:12px;">
        <p style="margin:0;">FleetAi - Boat Fleet Management</p>
      </td>
    </tr>
  </table>
</body>
</html>`
  }

  #buildPasswordResetHtml(resetUrl: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <tr>
      <td style="padding:40px 30px;text-align:center;background-color:#1e3a5f;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;">FleetAi</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px;color:#333333;font-size:22px;">Reset Your Password / Reinitialisation de mot de passe</h2>
        <p style="margin:0 0 15px;color:#555555;font-size:16px;line-height:1.5;">
          You requested a password reset. Click the button below to set a new password.
        </p>
        <p style="margin:0 0 25px;color:#555555;font-size:16px;line-height:1.5;">
          Vous avez demande une reinitialisation de mot de passe. Cliquez sur le bouton ci-dessous pour definir un nouveau mot de passe.
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
          <tr>
            <td style="border-radius:6px;background-color:#1e3a5f;">
              <a href="${resetUrl}" style="display:inline-block;padding:14px 30px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">
                Reset Password
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:25px 0 0;color:#888888;font-size:14px;line-height:1.5;">
          If you did not request this, you can safely ignore this email.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 30px;text-align:center;background-color:#f4f4f7;color:#888888;font-size:12px;">
        <p style="margin:0;">FleetAi - Boat Fleet Management</p>
      </td>
    </tr>
  </table>
</body>
</html>`
  }

  /**
   * Enqueue a simulator report email for a lead.
   */
  async sendSimulatorReport(lead: SimulatorLead) {
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
    }

    const breakdown = computeSimulatorCosts(input)

    const subject = isFr
      ? "Votre rapport d'entretien bateau — FleetAi"
      : 'Your boat maintenance report — FleetAi'

    const text = isFr
      ? `Votre rapport d'estimation de couts\n\nTotal: ${breakdown.totalMin} - ${breakdown.totalMax} EUR\n\nCreez votre compte: ${env.get('APP_URL')}/signup`
      : `Your cost estimation report\n\nTotal: ${breakdown.totalMin} - ${breakdown.totalMax} EUR\n\nCreate your account: ${env.get('APP_URL')}/signup`

    const html = this.#buildSimulatorReportHtml(breakdown, isFr)

    const partialPayload: Omit<SendEmailPayload, 'dedupKey'> = {
      to: lead.email,
      subject,
      text,
      html,
      correlationId: `simulator-report:${lead.email}`,
    }

    const key = SendEmail.dedupKey(partialPayload)
    const payload: SendEmailPayload = { ...partialPayload, dedupKey: key }

    await this.dedup.enqueueUnique({
      key,
      jobName: SendEmail.name,
      queue: 'emails',
      payload,
      dispatch: async (p) => {
        await SendEmail.dispatch(p)
      },
    })
  }

  /**
   * Enqueue simulator nurturing emails (J+3 and J+7) for a lead.
   */
  async sendSimulatorNurturing(lead: SimulatorLead) {
    const isFr = lead.locale === 'fr'

    // Email J+3 — 3 tips to reduce maintenance costs
    const subjectD3 = isFr
      ? "3 conseils pour reduire les couts d'entretien de votre bateau"
      : '3 tips to reduce your boat maintenance costs'

    const textD3 = isFr
      ? `3 conseils pour reduire vos couts d'entretien bateau\n\nCreez votre compte: ${env.get('APP_URL')}/signup`
      : `3 tips to reduce your boat maintenance costs\n\nCreate your account: ${env.get('APP_URL')}/signup`

    const htmlD3 = this.#buildNurturingD3Html(isFr)

    const partialPayloadD3: Omit<SendEmailPayload, 'dedupKey'> = {
      to: lead.email,
      subject: subjectD3,
      text: textD3,
      html: htmlD3,
      correlationId: `simulator-nurture-d3:${lead.email}`,
    }

    const keyD3 = `simulator-nurture-d3:${lead.email}`
    const payloadD3: SendEmailPayload = { ...partialPayloadD3, dedupKey: keyD3 }

    await this.dedup.enqueueUnique({
      key: keyD3,
      jobName: SendEmail.name,
      queue: 'emails',
      payload: payloadD3,
      dispatch: async (p) => {
        await SendEmail.dispatch(p).in('3d')
      },
    })

    // Email J+7 — Reminder with estimate
    const formatter = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    })

    const totalMinFormatted = formatter.format(lead.totalMin)
    const totalMaxFormatted = formatter.format(lead.totalMax)

    const subjectD7 = isFr
      ? "Votre estimation d'entretien bateau — toujours disponible"
      : 'Your boat maintenance estimate — still available'

    const textD7 = isFr
      ? `Votre bateau vous coutera entre ${totalMinFormatted} et ${totalMaxFormatted} par an en entretien. FleetAi vous aide a planifier et anticiper ces depenses.\n\nCreez votre compte: ${env.get('APP_URL')}/signup`
      : `Your boat will cost between ${totalMinFormatted} and ${totalMaxFormatted} per year in maintenance. FleetAi helps you plan and anticipate these expenses.\n\nCreate your account: ${env.get('APP_URL')}/signup`

    const htmlD7 = this.#buildNurturingD7Html(totalMinFormatted, totalMaxFormatted, isFr)

    const partialPayloadD7: Omit<SendEmailPayload, 'dedupKey'> = {
      to: lead.email,
      subject: subjectD7,
      text: textD7,
      html: htmlD7,
      correlationId: `simulator-nurture-d7:${lead.email}`,
    }

    const keyD7 = `simulator-nurture-d7:${lead.email}`
    const payloadD7: SendEmailPayload = { ...partialPayloadD7, dedupKey: keyD7 }

    await this.dedup.enqueueUnique({
      key: keyD7,
      jobName: SendEmail.name,
      queue: 'emails',
      payload: payloadD7,
      dispatch: async (p) => {
        await SendEmail.dispatch(p).in('7d')
      },
    })
  }

  #buildNurturingD3Html(isFr: boolean): string {
    const appUrl = env.get('APP_URL')

    const title = isFr
      ? "3 conseils pour reduire les couts d'entretien de votre bateau"
      : '3 tips to reduce your boat maintenance costs'

    const tips = isFr
      ? [
          {
            title: 'Anticipez les petites reparations',
            desc: "Une reparation mineure negligee peut rapidement devenir une facture importante. Inspectez regulierement votre bateau pour detecter les problemes avant qu'ils ne s'aggravent.",
          },
          {
            title: 'Comparez plusieurs devis',
            desc: "Ne vous contentez pas du premier devis. Demandez au moins 2 ou 3 estimations pour les travaux importants afin d'obtenir le meilleur rapport qualite-prix.",
          },
          {
            title: 'Hivernez votre bateau correctement',
            desc: "Un hivernage bien fait protege votre bateau du gel, de l'humidite et de la corrosion. Investir dans un bon hivernage, c'est economiser sur les reparations au printemps.",
          },
        ]
      : [
          {
            title: 'Anticipate small repairs',
            desc: 'A neglected minor repair can quickly become a major expense. Regularly inspect your boat to catch problems before they worsen.',
          },
          {
            title: 'Compare multiple quotes',
            desc: "Don't settle for the first quote. Request at least 2 or 3 estimates for major work to get the best value for your money.",
          },
          {
            title: 'Winter your boat properly',
            desc: 'Proper winterization protects your boat from frost, humidity, and corrosion. Investing in good winterization saves on spring repairs.',
          },
        ]

    const ctaText = isFr ? 'Suivre mes depenses sur FleetAi' : 'Track my expenses on FleetAi'

    const tipsHtml = tips
      .map(
        (tip, index) => `
        <tr>
          <td style="padding:15px 20px;border-bottom:1px solid #eeeeee;">
            <p style="margin:0 0 5px;color:#1e3a5f;font-size:16px;font-weight:bold;">${index + 1}. ${tip.title}</p>
            <p style="margin:0;color:#555555;font-size:14px;line-height:1.5;">${tip.desc}</p>
          </td>
        </tr>`
      )
      .join('')

    return `<!DOCTYPE html>
<html lang="${isFr ? 'fr' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <tr>
      <td style="padding:40px 30px;text-align:center;background-color:#1e3a5f;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;">FleetAi</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 25px;color:#333333;font-size:22px;">${title}</h2>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 25px;border:1px solid #eeeeee;border-radius:6px;">
          <tbody>
            ${tipsHtml}
          </tbody>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
          <tr>
            <td style="border-radius:6px;background-color:#1e3a5f;">
              <a href="${appUrl}/signup" style="display:inline-block;padding:14px 30px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">
                ${ctaText}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 30px;text-align:center;background-color:#f4f4f7;color:#888888;font-size:12px;">
        <p style="margin:0;">FleetAi - Boat Fleet Management</p>
      </td>
    </tr>
  </table>
</body>
</html>`
  }

  #buildNurturingD7Html(totalMin: string, totalMax: string, isFr: boolean): string {
    const appUrl = env.get('APP_URL')

    const title = isFr
      ? "Votre estimation d'entretien bateau — toujours disponible"
      : 'Your boat maintenance estimate — still available'

    const message = isFr
      ? `Votre bateau vous coutera entre <strong>${totalMin}</strong> et <strong>${totalMax}</strong> par an en entretien. FleetAi vous aide a planifier et anticiper ces depenses.`
      : `Your boat will cost between <strong>${totalMin}</strong> and <strong>${totalMax}</strong> per year in maintenance. FleetAi helps you plan and anticipate these expenses.`

    const ctaText = isFr ? 'Creer mon compte gratuitement' : 'Create my free account'
    const gdprText = isFr ? 'Vos donnees ne seront pas partagees.' : 'Your data will not be shared.'

    return `<!DOCTYPE html>
<html lang="${isFr ? 'fr' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <tr>
      <td style="padding:40px 30px;text-align:center;background-color:#1e3a5f;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;">FleetAi</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px;color:#333333;font-size:22px;">${title}</h2>
        <p style="margin:0 0 25px;color:#555555;font-size:16px;line-height:1.6;">
          ${message}
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
          <tr>
            <td style="border-radius:6px;background-color:#1e3a5f;">
              <a href="${appUrl}/signup" style="display:inline-block;padding:14px 30px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">
                ${ctaText}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 30px;text-align:center;background-color:#f4f4f7;color:#888888;font-size:12px;">
        <p style="margin:0 0 10px;">${gdprText}</p>
        <p style="margin:0;">FleetAi - Boat Fleet Management</p>
      </td>
    </tr>
  </table>
</body>
</html>`
  }

  async sendReminderInactiveAccount(params: { to: string; name: string | null; orgName: string }) {
    const displayName = params.name ?? params.to
    const subject = 'Ajoutez votre premier bateau — FleetAi / Add your first boat — FleetAi'
    const text = `Bonjour ${displayName},\n\nVotre organisation ${params.orgName} n'a pas encore de bateau enregistre. Ajoutez votre flotte pour profiter de toutes les fonctionnalites.\n\nHello ${displayName},\n\nYour organisation ${params.orgName} has no boats yet. Add your fleet to unlock all features.\n\n${env.get('APP_URL')}/boats`

    const html = this.#buildReminderInactiveAccountHtml(displayName, params.orgName)
    const correlationId = `reminder-inactive-account:${params.to}:${params.orgName}`

    const partialPayload: Omit<SendEmailPayload, 'dedupKey'> = {
      to: params.to,
      subject,
      text,
      html,
      correlationId,
    }

    const key = SendEmail.dedupKey(partialPayload)
    const payload: SendEmailPayload = { ...partialPayload, dedupKey: key }

    await this.dedup.enqueueUnique({
      key,
      jobName: SendEmail.name,
      queue: 'emails',
      payload,
      dispatch: async (p) => {
        await SendEmail.dispatch(p)
      },
    })
  }

  async sendReminderIncompleteBoats(params: {
    to: string
    name: string | null
    boats: ReminderBoatItem[]
  }) {
    const displayName = params.name ?? params.to
    const subject =
      'Des bateaux incomplets dans votre flotte — FleetAi / Incomplete boats in your fleet — FleetAi'
    const boatNames = params.boats.map((b) => b.name).join(', ')
    const text = `Bonjour ${displayName},\n\nLes bateaux suivants manquent d'informations importantes : ${boatNames}.\n\nHello ${displayName},\n\nThe following boats are missing key information: ${boatNames}.\n\n${env.get('APP_URL')}/boats`

    const html = this.#buildReminderIncompleteBoatsHtml(displayName, params.boats)
    const correlationId = `reminder-incomplete-boats:${params.to}:${params.boats.map((b) => b.id).join('-')}`

    const partialPayload: Omit<SendEmailPayload, 'dedupKey'> = {
      to: params.to,
      subject,
      text,
      html,
      correlationId,
    }

    const key = SendEmail.dedupKey(partialPayload)
    const payload: SendEmailPayload = { ...partialPayload, dedupKey: key }

    await this.dedup.enqueueUnique({
      key,
      jobName: SendEmail.name,
      queue: 'emails',
      payload,
      dispatch: async (p) => {
        await SendEmail.dispatch(p)
      },
    })
  }

  async sendReminderIncompletePorts(params: {
    to: string
    name: string | null
    ports: ReminderPortItem[]
  }) {
    const displayName = params.name ?? params.to
    const subject =
      'Des ports incomplets dans votre compte — FleetAi / Incomplete ports in your account — FleetAi'
    const portNames = params.ports.map((p) => p.name).join(', ')
    const text = `Bonjour ${displayName},\n\nLes ports suivants manquent de ville ou de pays : ${portNames}.\n\nHello ${displayName},\n\nThe following ports are missing city or country: ${portNames}.\n\n${env.get('APP_URL')}/ports`

    const html = this.#buildReminderIncompletePortsHtml(displayName, params.ports)
    const correlationId = `reminder-incomplete-ports:${params.to}:${params.ports.map((p) => p.id).join('-')}`

    const partialPayload: Omit<SendEmailPayload, 'dedupKey'> = {
      to: params.to,
      subject,
      text,
      html,
      correlationId,
    }

    const key = SendEmail.dedupKey(partialPayload)
    const payload: SendEmailPayload = { ...partialPayload, dedupKey: key }

    await this.dedup.enqueueUnique({
      key,
      jobName: SendEmail.name,
      queue: 'emails',
      payload,
      dispatch: async (p) => {
        await SendEmail.dispatch(p)
      },
    })
  }

  async sendReminderInactiveLogin(params: {
    to: string
    name: string | null
    lastLoginAt: string | null
  }) {
    const displayName = params.name ?? params.to
    const subject = 'Votre flotte vous attend — FleetAi / Your fleet is waiting — FleetAi'
    const text = `Bonjour ${displayName},\n\nVous ne vous etes pas connecte depuis plus de 30 jours. Revenez gerer votre flotte sur FleetAi.\n\nHello ${displayName},\n\nYou haven't logged in for over 30 days. Come back to manage your fleet on FleetAi.\n\n${env.get('APP_URL')}/dashboard`

    const html = this.#buildReminderInactiveLoginHtml(displayName)
    const correlationId = `reminder-inactive-login:${params.to}`

    const partialPayload: Omit<SendEmailPayload, 'dedupKey'> = {
      to: params.to,
      subject,
      text,
      html,
      correlationId,
    }

    const key = SendEmail.dedupKey(partialPayload)
    const payload: SendEmailPayload = { ...partialPayload, dedupKey: key }

    await this.dedup.enqueueUnique({
      key,
      jobName: SendEmail.name,
      queue: 'emails',
      payload,
      dispatch: async (p) => {
        await SendEmail.dispatch(p)
      },
    })
  }

  async sendReminderOverdueTasks(params: {
    to: string
    name: string | null
    tasks: ReminderTaskItem[]
  }) {
    const displayName = params.name ?? params.to
    const subject =
      'Des taches de maintenance en retard — FleetAi / Overdue maintenance tasks — FleetAi'
    const taskTitles = params.tasks.map((t) => `${t.title} (${t.boatName})`).join(', ')
    const text = `Bonjour ${displayName},\n\nLes taches suivantes sont en retard : ${taskTitles}.\n\nHello ${displayName},\n\nThe following tasks are overdue: ${taskTitles}.\n\n${env.get('APP_URL')}/maintenance`

    const html = this.#buildReminderOverdueTasksHtml(displayName, params.tasks)
    const taskIds = params.tasks.map((t) => t.id).join('-')
    const correlationId = `reminder-overdue-tasks:${params.to}:${taskIds}`

    const partialPayload: Omit<SendEmailPayload, 'dedupKey'> = {
      to: params.to,
      subject,
      text,
      html,
      correlationId,
    }

    const key = SendEmail.dedupKey(partialPayload)
    const payload: SendEmailPayload = { ...partialPayload, dedupKey: key }

    await this.dedup.enqueueUnique({
      key,
      jobName: SendEmail.name,
      queue: 'emails',
      payload,
      dispatch: async (p) => {
        await SendEmail.dispatch(p)
      },
    })
  }

  async sendReminderEngineTasks(params: {
    to: string
    name: string | null
    tasks: ReminderTaskItem[]
  }) {
    const displayName = params.name ?? params.to
    const subject = 'Maintenance moteur a venir — FleetAi / Upcoming engine maintenance — FleetAi'
    const taskTitles = params.tasks.map((t) => `${t.title} (${t.boatName})`).join(', ')
    const text = `Bonjour ${displayName},\n\nLes taches moteur suivantes arrivent a echeance dans 30 jours : ${taskTitles}.\n\nHello ${displayName},\n\nThe following engine tasks are due within 30 days: ${taskTitles}.\n\n${env.get('APP_URL')}/maintenance`

    const html = this.#buildReminderEngineTasksHtml(displayName, params.tasks)
    const taskIds = params.tasks.map((t) => t.id).join('-')
    const correlationId = `reminder-engine-tasks:${params.to}:${taskIds}`

    const partialPayload: Omit<SendEmailPayload, 'dedupKey'> = {
      to: params.to,
      subject,
      text,
      html,
      correlationId,
    }

    const key = SendEmail.dedupKey(partialPayload)
    const payload: SendEmailPayload = { ...partialPayload, dedupKey: key }

    await this.dedup.enqueueUnique({
      key,
      jobName: SendEmail.name,
      queue: 'emails',
      payload,
      dispatch: async (p) => {
        await SendEmail.dispatch(p)
      },
    })
  }

  async sendReminderBoatCheckTasks(params: {
    to: string
    name: string | null
    tasks: ReminderTaskItem[]
  }) {
    const displayName = params.name ?? params.to
    const subject = 'Inspection bateau a venir — FleetAi / Upcoming boat inspection — FleetAi'
    const taskTitles = params.tasks.map((t) => `${t.title} (${t.boatName})`).join(', ')
    const text = `Bonjour ${displayName},\n\nLes inspections suivantes arrivent a echeance dans 30 jours : ${taskTitles}.\n\nHello ${displayName},\n\nThe following boat inspections are due within 30 days: ${taskTitles}.\n\n${env.get('APP_URL')}/maintenance`

    const html = this.#buildReminderBoatCheckTasksHtml(displayName, params.tasks)
    const taskIds = params.tasks.map((t) => t.id).join('-')
    const correlationId = `reminder-boat-check-tasks:${params.to}:${taskIds}`

    const partialPayload: Omit<SendEmailPayload, 'dedupKey'> = {
      to: params.to,
      subject,
      text,
      html,
      correlationId,
    }

    const key = SendEmail.dedupKey(partialPayload)
    const payload: SendEmailPayload = { ...partialPayload, dedupKey: key }

    await this.dedup.enqueueUnique({
      key,
      jobName: SendEmail.name,
      queue: 'emails',
      payload,
      dispatch: async (p) => {
        await SendEmail.dispatch(p)
      },
    })
  }

  #buildReminderInactiveAccountHtml(displayName: string, orgName: string): string {
    const appUrl = env.get('APP_URL')
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ajoutez votre premier bateau</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <tr>
      <td style="padding:40px 30px;text-align:center;background-color:#1e3a5f;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;">FleetAi</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px;color:#333333;font-size:22px;">Bonjour ${displayName},</h2>
        <p style="margin:0 0 15px;color:#555555;font-size:16px;line-height:1.5;">
          Votre organisation <strong>${orgName}</strong> n'a pas encore de bateau enregistre. Ajoutez votre flotte pour profiter de la gestion de maintenance, des plannings et des alertes.
        </p>
        <p style="margin:0 0 25px;color:#555555;font-size:16px;line-height:1.5;">
          Your organisation <strong>${orgName}</strong> has no boats yet. Add your fleet to unlock maintenance tracking, scheduling, and alerts.
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
          <tr>
            <td style="border-radius:6px;background-color:#1e3a5f;">
              <a href="${appUrl}/boats" style="display:inline-block;padding:14px 30px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">
                Ajouter un bateau / Add a boat
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 30px;text-align:center;background-color:#f4f4f7;color:#888888;font-size:12px;">
        <p style="margin:0;">FleetAi - Boat Fleet Management</p>
      </td>
    </tr>
  </table>
</body>
</html>`
  }

  #buildReminderIncompleteBoatsHtml(displayName: string, boats: ReminderBoatItem[]): string {
    const appUrl = env.get('APP_URL')
    const boatRows = boats
      .map(
        (b) => `<tr>
          <td style="padding:10px 15px;border-bottom:1px solid #eeeeee;color:#333333;font-size:14px;">${b.name}</td>
          <td style="padding:10px 15px;border-bottom:1px solid #eeeeee;text-align:right;">
            <a href="${appUrl}/boats/${b.id}" style="color:#1e3a5f;font-size:14px;">Completer / Complete</a>
          </td>
        </tr>`
      )
      .join('')

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bateaux incomplets</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <tr>
      <td style="padding:40px 30px;text-align:center;background-color:#1e3a5f;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;">FleetAi</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px;color:#333333;font-size:22px;">Bonjour ${displayName},</h2>
        <p style="margin:0 0 20px;color:#555555;font-size:16px;line-height:1.5;">
          Les bateaux suivants manquent d'informations cles (type, dimensions, annee...). Completez-les pour profiter des estimations de couts et des alertes maintenance.
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 25px;border:1px solid #eeeeee;border-radius:6px;">
          <tbody>${boatRows}</tbody>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
          <tr>
            <td style="border-radius:6px;background-color:#1e3a5f;">
              <a href="${appUrl}/boats" style="display:inline-block;padding:14px 30px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">
                Voir ma flotte / View my fleet
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 30px;text-align:center;background-color:#f4f4f7;color:#888888;font-size:12px;">
        <p style="margin:0;">FleetAi - Boat Fleet Management</p>
      </td>
    </tr>
  </table>
</body>
</html>`
  }

  #buildReminderIncompletePortsHtml(displayName: string, ports: ReminderPortItem[]): string {
    const appUrl = env.get('APP_URL')
    const portRows = ports
      .map(
        (p) => `<tr>
          <td style="padding:10px 15px;border-bottom:1px solid #eeeeee;color:#333333;font-size:14px;">${p.name}</td>
          <td style="padding:10px 15px;border-bottom:1px solid #eeeeee;text-align:right;">
            <a href="${appUrl}/ports/${p.id}" style="color:#1e3a5f;font-size:14px;">Completer / Complete</a>
          </td>
        </tr>`
      )
      .join('')

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ports incomplets</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <tr>
      <td style="padding:40px 30px;text-align:center;background-color:#1e3a5f;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;">FleetAi</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px;color:#333333;font-size:22px;">Bonjour ${displayName},</h2>
        <p style="margin:0 0 20px;color:#555555;font-size:16px;line-height:1.5;">
          Les ports suivants sont incomplets (ville ou pays manquants). Completez-les pour faciliter la gestion de vos escales.
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 25px;border:1px solid #eeeeee;border-radius:6px;">
          <tbody>${portRows}</tbody>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
          <tr>
            <td style="border-radius:6px;background-color:#1e3a5f;">
              <a href="${appUrl}/ports" style="display:inline-block;padding:14px 30px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">
                Voir mes ports / View my ports
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 30px;text-align:center;background-color:#f4f4f7;color:#888888;font-size:12px;">
        <p style="margin:0;">FleetAi - Boat Fleet Management</p>
      </td>
    </tr>
  </table>
</body>
</html>`
  }

  #buildReminderInactiveLoginHtml(displayName: string): string {
    const appUrl = env.get('APP_URL')
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre flotte vous attend</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <tr>
      <td style="padding:40px 30px;text-align:center;background-color:#1e3a5f;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;">FleetAi</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px;color:#333333;font-size:22px;">Bonjour ${displayName},</h2>
        <p style="margin:0 0 15px;color:#555555;font-size:16px;line-height:1.5;">
          Vous ne vous etes pas connecte depuis plus de 30 jours. Des maintenances sont peut-etre a planifier ou en retard sur votre flotte.
        </p>
        <p style="margin:0 0 25px;color:#555555;font-size:16px;line-height:1.5;">
          You haven't logged in for over 30 days. Some maintenance tasks on your fleet may need attention.
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
          <tr>
            <td style="border-radius:6px;background-color:#1e3a5f;">
              <a href="${appUrl}/dashboard" style="display:inline-block;padding:14px 30px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">
                Revenir sur FleetAi / Back to FleetAi
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 30px;text-align:center;background-color:#f4f4f7;color:#888888;font-size:12px;">
        <p style="margin:0;">FleetAi - Boat Fleet Management</p>
      </td>
    </tr>
  </table>
</body>
</html>`
  }

  #buildSimulatorReportHtml(
    breakdown: ReturnType<typeof computeSimulatorCosts>,
    isFr: boolean
  ): string {
    const appUrl = env.get('APP_URL')
    const formatter = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    })

    const categoryLabels: Record<string, { fr: string; en: string }> = {
      hull: { fr: 'Coque', en: 'Hull' },
      engine: { fr: 'Moteur', en: 'Engine' },
      safety: { fr: 'Securite', en: 'Safety' },
      electrical: { fr: 'Electrique', en: 'Electrical' },
      mooring: { fr: 'Mouillage', en: 'Mooring' },
      rigging: { fr: 'Greement', en: 'Rigging' },
    }

    const title = isFr ? "Votre rapport d'estimation de couts" : 'Your cost estimation report'
    const totalLabel = isFr ? 'Total estime' : 'Estimated total'
    const ctaText = isFr ? 'Creer mon compte gratuitement' : 'Create my free account'
    const gdprText = isFr ? 'Vos donnees ne seront pas partagees.' : 'Your data will not be shared.'

    const categoryRows = breakdown.categories
      .map((cat: { key: string; minCost: number; maxCost: number }) => {
        const label = categoryLabels[cat.key]?.[isFr ? 'fr' : 'en'] ?? cat.key
        const range = `${formatter.format(cat.minCost)} - ${formatter.format(cat.maxCost)}`
        return `<tr>
          <td style="padding:10px 15px;border-bottom:1px solid #eeeeee;color:#333333;font-size:14px;">${label}</td>
          <td style="padding:10px 15px;border-bottom:1px solid #eeeeee;color:#333333;font-size:14px;text-align:right;">${range}</td>
        </tr>`
      })
      .join('')

    const totalRange = `${formatter.format(breakdown.totalMin)} - ${formatter.format(breakdown.totalMax)}`

    return `<!DOCTYPE html>
<html lang="${isFr ? 'fr' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <tr>
      <td style="padding:40px 30px;text-align:center;background-color:#1e3a5f;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;">FleetAi</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px;color:#333333;font-size:22px;">${title}</h2>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 25px;border:1px solid #eeeeee;border-radius:6px;">
          <thead>
            <tr style="background-color:#f9f9f9;">
              <th style="padding:12px 15px;text-align:left;color:#555555;font-size:14px;font-weight:600;">${isFr ? 'Categorie' : 'Category'}</th>
              <th style="padding:12px 15px;text-align:right;color:#555555;font-size:14px;font-weight:600;">${isFr ? 'Cout annuel' : 'Annual cost'}</th>
            </tr>
          </thead>
          <tbody>
            ${categoryRows}
          </tbody>
          <tfoot>
            <tr style="background-color:#1e3a5f;">
              <td style="padding:12px 15px;color:#ffffff;font-size:16px;font-weight:bold;">${totalLabel}</td>
              <td style="padding:12px 15px;color:#ffffff;font-size:16px;font-weight:bold;text-align:right;">${totalRange}</td>
            </tr>
          </tfoot>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
          <tr>
            <td style="border-radius:6px;background-color:#1e3a5f;">
              <a href="${appUrl}/signup" style="display:inline-block;padding:14px 30px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">
                ${ctaText}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 30px;text-align:center;background-color:#f4f4f7;color:#888888;font-size:12px;">
        <p style="margin:0 0 10px;">${gdprText}</p>
        <p style="margin:0;">FleetAi - Boat Fleet Management</p>
      </td>
    </tr>
  </table>
</body>
</html>`
  }

  #buildReminderOverdueTasksHtml(displayName: string, tasks: ReminderTaskItem[]): string {
    const appUrl = env.get('APP_URL')
    const taskRows = tasks
      .map(
        (t) => `<tr>
          <td style="padding:10px 15px;border-bottom:1px solid #eeeeee;color:#333333;font-size:14px;">${t.title}</td>
          <td style="padding:10px 15px;border-bottom:1px solid #eeeeee;color:#555555;font-size:14px;">${t.boatName}</td>
          <td style="padding:10px 15px;border-bottom:1px solid #eeeeee;color:#cc3300;font-size:14px;">${t.dueAt ? t.dueAt.slice(0, 10) : '—'}</td>
        </tr>`
      )
      .join('')

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Taches en retard</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <tr>
      <td style="padding:40px 30px;text-align:center;background-color:#1e3a5f;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;">FleetAi</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px;color:#333333;font-size:22px;">Bonjour ${displayName},</h2>
        <p style="margin:0 0 20px;color:#555555;font-size:16px;line-height:1.5;">
          Les taches de maintenance suivantes sont en retard. Planifiez-les des que possible pour preserver votre flotte.
        </p>
        <p style="margin:0 0 20px;color:#555555;font-size:16px;line-height:1.5;">
          The following maintenance tasks are overdue. Schedule them as soon as possible to keep your fleet in good shape.
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 25px;border:1px solid #eeeeee;border-radius:6px;">
          <thead>
            <tr>
              <th style="padding:10px 15px;text-align:left;background-color:#f4f4f7;color:#555555;font-size:12px;text-transform:uppercase;">Tache / Task</th>
              <th style="padding:10px 15px;text-align:left;background-color:#f4f4f7;color:#555555;font-size:12px;text-transform:uppercase;">Bateau / Boat</th>
              <th style="padding:10px 15px;text-align:left;background-color:#f4f4f7;color:#555555;font-size:12px;text-transform:uppercase;">Echeance / Due</th>
            </tr>
          </thead>
          <tbody>${taskRows}</tbody>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
          <tr>
            <td style="border-radius:6px;background-color:#cc3300;">
              <a href="${appUrl}/maintenance" style="display:inline-block;padding:14px 30px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">
                Voir les taches / View tasks
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 30px;text-align:center;background-color:#f4f4f7;color:#888888;font-size:12px;">
        <p style="margin:0;">FleetAi - Boat Fleet Management</p>
      </td>
    </tr>
  </table>
</body>
</html>`
  }

  #buildReminderEngineTasksHtml(displayName: string, tasks: ReminderTaskItem[]): string {
    const appUrl = env.get('APP_URL')
    const taskRows = tasks
      .map(
        (t) => `<tr>
          <td style="padding:10px 15px;border-bottom:1px solid #eeeeee;color:#333333;font-size:14px;">${t.title}</td>
          <td style="padding:10px 15px;border-bottom:1px solid #eeeeee;color:#555555;font-size:14px;">${t.boatName}</td>
          <td style="padding:10px 15px;border-bottom:1px solid #eeeeee;color:#e07000;font-size:14px;">${t.dueAt ? t.dueAt.slice(0, 10) : '—'}</td>
        </tr>`
      )
      .join('')

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Maintenance moteur a venir</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <tr>
      <td style="padding:40px 30px;text-align:center;background-color:#1e3a5f;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;">FleetAi</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px;color:#333333;font-size:22px;">Bonjour ${displayName},</h2>
        <p style="margin:0 0 20px;color:#555555;font-size:16px;line-height:1.5;">
          Des maintenances moteur arrivent a echeance dans les 30 prochains jours. Anticipez pour eviter les pannes.
        </p>
        <p style="margin:0 0 20px;color:#555555;font-size:16px;line-height:1.5;">
          Engine maintenance tasks are due within the next 30 days. Plan ahead to avoid breakdowns.
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 25px;border:1px solid #eeeeee;border-radius:6px;">
          <thead>
            <tr>
              <th style="padding:10px 15px;text-align:left;background-color:#f4f4f7;color:#555555;font-size:12px;text-transform:uppercase;">Tache / Task</th>
              <th style="padding:10px 15px;text-align:left;background-color:#f4f4f7;color:#555555;font-size:12px;text-transform:uppercase;">Bateau / Boat</th>
              <th style="padding:10px 15px;text-align:left;background-color:#f4f4f7;color:#555555;font-size:12px;text-transform:uppercase;">Echeance / Due</th>
            </tr>
          </thead>
          <tbody>${taskRows}</tbody>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
          <tr>
            <td style="border-radius:6px;background-color:#1e3a5f;">
              <a href="${appUrl}/maintenance" style="display:inline-block;padding:14px 30px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">
                Planifier / Schedule
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 30px;text-align:center;background-color:#f4f4f7;color:#888888;font-size:12px;">
        <p style="margin:0;">FleetAi - Boat Fleet Management</p>
      </td>
    </tr>
  </table>
</body>
</html>`
  }

  #buildReminderBoatCheckTasksHtml(displayName: string, tasks: ReminderTaskItem[]): string {
    const appUrl = env.get('APP_URL')
    const taskRows = tasks
      .map(
        (t) => `<tr>
          <td style="padding:10px 15px;border-bottom:1px solid #eeeeee;color:#333333;font-size:14px;">${t.title}</td>
          <td style="padding:10px 15px;border-bottom:1px solid #eeeeee;color:#555555;font-size:14px;">${t.boatName}</td>
          <td style="padding:10px 15px;border-bottom:1px solid #eeeeee;color:#e07000;font-size:14px;">${t.dueAt ? t.dueAt.slice(0, 10) : '—'}</td>
        </tr>`
      )
      .join('')

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inspection bateau a venir</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <tr>
      <td style="padding:40px 30px;text-align:center;background-color:#1e3a5f;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;">FleetAi</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px;color:#333333;font-size:22px;">Bonjour ${displayName},</h2>
        <p style="margin:0 0 20px;color:#555555;font-size:16px;line-height:1.5;">
          Des inspections bateau arrivent a echeance dans les 30 prochains jours. Assurez-vous que vos bateaux sont en etat de naviguer.
        </p>
        <p style="margin:0 0 20px;color:#555555;font-size:16px;line-height:1.5;">
          Boat inspections are due within the next 30 days. Make sure your boats are seaworthy.
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 25px;border:1px solid #eeeeee;border-radius:6px;">
          <thead>
            <tr>
              <th style="padding:10px 15px;text-align:left;background-color:#f4f4f7;color:#555555;font-size:12px;text-transform:uppercase;">Tache / Task</th>
              <th style="padding:10px 15px;text-align:left;background-color:#f4f4f7;color:#555555;font-size:12px;text-transform:uppercase;">Bateau / Boat</th>
              <th style="padding:10px 15px;text-align:left;background-color:#f4f4f7;color:#555555;font-size:12px;text-transform:uppercase;">Echeance / Due</th>
            </tr>
          </thead>
          <tbody>${taskRows}</tbody>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
          <tr>
            <td style="border-radius:6px;background-color:#1e3a5f;">
              <a href="${appUrl}/maintenance" style="display:inline-block;padding:14px 30px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">
                Voir les inspections / View inspections
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 30px;text-align:center;background-color:#f4f4f7;color:#888888;font-size:12px;">
        <p style="margin:0;">FleetAi - Boat Fleet Management</p>
      </td>
    </tr>
  </table>
</body>
</html>`
  }
}
