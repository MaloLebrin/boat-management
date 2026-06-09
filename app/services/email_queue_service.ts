import SendEmail, { type SendEmailPayload } from '#jobs/send_email'
import type SimulatorLead from '#models/simulator_lead'
import QueueDedupService from '#services/queue_dedup_service'
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
}
