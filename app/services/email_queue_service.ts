import edge from 'edge.js'
import SendEmail, { type SendEmailPayload } from '#jobs/send_email'
import QueueDedupService from '#services/queue_dedup_service'
import type { ReminderBoatItem, ReminderPortItem, ReminderTaskItem } from '#shared/types/reminder'
import type { ReminderDocumentItem } from '#shared/types/boat_document'
import type { PlanModule, PlanTier } from '#shared/types/plan'
import type { BrandingEmailParams } from '#shared/types/branding'
import { EMAIL_VERIFICATION_TOKEN_TTL_HOURS } from '#shared/constants/email_verification'
import env from '#start/env'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import i18nManager from '@adonisjs/i18n/services/main'
import { toAppLocale } from '#shared/helpers/locale_path'
import { formatDateLong } from '#shared/helpers/date_format'
import { formatCurrency } from '#shared/helpers/number_format'
import type { PublicBookingEmailParams } from '#shared/types/public_booking'
import type { CrewCertificationAlert } from '#shared/types/crew'
import type { TwoFactorEvent } from '#shared/types/two_factor'
import type { DeviceInfo } from '#shared/types/user_session'

@inject()
export default class EmailQueueService {
  constructor(private dedup: QueueDedupService) {}

  /**
   * Toute notification `SendEmail` passe ici : clé de déduplication dérivée
   * du payload (`correlationId` sinon empreinte sujet + texte), file
   * `emails`, dispatch du job. Les envois qui ont leur propre job (facture,
   * contrat de location) gardent leur clé horodatée et appellent `dedup`
   * directement.
   */
  async #enqueue(partialPayload: Omit<SendEmailPayload, 'dedupKey'>): Promise<void> {
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

  async sendWelcome(params: { to: string; name: string | null }) {
    const displayName = params.name || params.to
    const subject = 'Bienvenue sur FleetAi / Welcome to FleetAi'
    const text = `Bonjour ${displayName},\n\nBienvenue sur FleetAi, votre plateforme de gestion de flotte.\n\nHello ${displayName},\n\nWelcome to FleetAi, your fleet management platform.\n\nAccess your dashboard: /dashboard`

    const html = await edge.render('emails/welcome', {
      displayName,
      appUrl: env.get('APP_URL'),
    })

    await this.#enqueue({
      to: params.to,
      subject,
      text,
      html,
      correlationId: `welcome:${params.to}`,
    })
  }

  async sendPasswordReset(params: { to: string; resetUrl: string }) {
    const subject = 'Reset your password / Reinitialisation de mot de passe'
    const text = `Click here to reset your password: ${params.resetUrl}\n\nCliquez ici pour reinitialiser votre mot de passe : ${params.resetUrl}`

    const html = await edge.render('emails/password_reset', {
      resetUrl: params.resetUrl,
    })

    await this.#enqueue({
      to: params.to,
      subject,
      text,
      html,
      correlationId: `password-reset:${params.to}:${Date.now()}`,
    })
  }

  /**
   * Lien de vérification d'adresse (#768).
   *
   * `correlationId` horodaté, comme la réinitialisation de mot de passe : un
   * renvoi demandé par l'utilisateur doit repartir, pas être avalé par la
   * déduplication de la file.
   */
  async sendEmailVerification(params: { to: string; verificationUrl: string }) {
    const subject = 'Confirm your email / Confirmez votre adresse e-mail'
    const text = `Confirm your email address: ${params.verificationUrl}\n\nConfirmez votre adresse e-mail : ${params.verificationUrl}`

    const html = await edge.render('emails/email_verification', {
      verificationUrl: params.verificationUrl,
      ttlHours: EMAIL_VERIFICATION_TOKEN_TTL_HOURS,
    })

    await this.#enqueue({
      to: params.to,
      subject,
      text,
      html,
      correlationId: `email-verification:${params.to}:${Date.now()}`,
    })
  }

  /**
   * Changement de double authentification (#884) : activation, désactivation,
   * code de secours utilisé, codes régénérés. Envoyé au titulaire du compte,
   * dans sa langue — si ce n'est pas lui qui a agi, c'est son signal d'alerte.
   * `correlationId` horodaté : deux changements successifs partent tous deux.
   */
  async sendTwoFactorChanged(params: {
    to: string
    name: string | null
    locale: string | null
    event: TwoFactorEvent
  }) {
    const i18n = i18nManager.locale(toAppLocale(params.locale))
    const displayName = params.name ?? params.to
    const subject = i18n.t(`auth.twoFactor.emails.subject.${params.event}`)
    const body = i18n.t(`auth.twoFactor.emails.body.${params.event}`)
    const notYou = i18n.t('auth.twoFactor.emails.notYou')
    const securityUrl = `${env.get('APP_URL')}/settings/me`
    const text = [
      i18n.t('auth.twoFactor.emails.greeting', { name: displayName }),
      body,
      notYou,
      securityUrl,
    ].join('\n\n')

    const html = await edge.render('emails/two_factor_changed', {
      i18n,
      displayName,
      body,
      notYou,
      securityUrl,
    })

    await this.#enqueue({
      to: params.to,
      subject,
      text,
      html,
      correlationId: `two-factor:${params.event}:${params.to}:${Date.now()}`,
    })
  }

  /**
   * Connexion depuis un appareil jamais vu sur le compte (#885). Désactivable
   * depuis `/settings/me` (`users.notify_new_login`).
   */
  async sendNewLogin(params: {
    to: string
    name: string | null
    locale: string | null
    device: DeviceInfo
    ipAddress: string | null
  }) {
    const i18n = i18nManager.locale(toAppLocale(params.locale))
    const displayName = params.name ?? params.to
    const unknown = i18n.t('auth.newLogin.unknown')
    const device = i18n.t('auth.newLogin.device', {
      browser: params.device.browser ?? unknown,
      os: params.device.os ?? unknown,
    })
    const subject = i18n.t('auth.newLogin.subject')
    const body = i18n.t('auth.newLogin.body')
    const details = [
      `${i18n.t('auth.newLogin.deviceLabel')} ${device}`,
      `${i18n.t('auth.newLogin.ipLabel')} ${params.ipAddress ?? unknown}`,
      `${i18n.t('auth.newLogin.dateLabel')} ${formatDateLong(DateTime.now().toISO()!, i18n.locale)}`,
    ]
    const notYou = i18n.t('auth.newLogin.notYou')
    const securityUrl = `${env.get('APP_URL')}/settings/me`
    const text = [
      i18n.t('auth.newLogin.greeting', { name: displayName }),
      body,
      details.join('\n'),
      notYou,
      securityUrl,
    ].join('\n\n')

    const html = await edge.render('emails/new_login', {
      i18n,
      displayName,
      body,
      details,
      notYou,
      securityUrl,
    })

    await this.#enqueue({
      to: params.to,
      subject,
      text,
      html,
      correlationId: `new-login:${params.to}:${Date.now()}`,
    })
  }

  /**
   * Suppression en libre-service (#886) : confirmation d'une suppression de
   * compte (`account`) ou d'organisation (`organization`), avec la date de
   * purge et la marche à suivre pour l'annuler. Bilingue via `i18n`.
   */
  async sendDeletionScheduled(params: {
    kind: 'account' | 'organization'
    to: string
    name: string | null
    locale: string | null
    purgeAt: DateTime
    organizationName?: string
  }) {
    const i18n = i18nManager.locale(toAppLocale(params.locale))
    const displayName = params.name ?? params.to
    const prefix = `settings.danger.emails.${params.kind}`
    const values = {
      date: formatDateLong(params.purgeAt.toISO()!, i18n.locale),
      organization: params.organizationName ?? '',
    }
    const subject = i18n.t(`${prefix}.subject`, values)
    const greeting = i18n.t('settings.danger.emails.greeting', { name: displayName })
    const paragraphs = [i18n.t(`${prefix}.body`, values), i18n.t(`${prefix}.undo`, values)]
    const ctaUrl = `${env.get('APP_URL')}${params.kind === 'account' ? '/login' : '/settings/org'}`
    const ctaLabel = i18n.t(`${prefix}.cta`)
    const text = [greeting, ...paragraphs, ctaUrl].join('\n\n')

    const html = await edge.render('emails/deletion_scheduled', {
      greeting,
      paragraphs,
      ctaUrl,
      ctaLabel,
    })

    await this.#enqueue({
      to: params.to,
      subject,
      text,
      html,
      correlationId: `deletion-scheduled:${params.kind}:${params.to}:${params.purgeAt.toISODate()}`,
    })
  }

  async sendInvitation(params: {
    to: string
    inviterName: string | null
    orgName: string
    acceptUrl: string
    branding?: BrandingEmailParams | null
  }) {
    const subject = `You've been invited to join ${params.orgName} / Vous avez ete invite a rejoindre ${params.orgName}`
    const inviterDisplay = params.inviterName ?? 'A team member'
    const text = `${inviterDisplay} has invited you to join ${params.orgName} on FleetAi.\n\nClick here to accept: ${params.acceptUrl}\n\n${inviterDisplay} vous a invite a rejoindre ${params.orgName} sur FleetAi.\n\nCliquez ici pour accepter : ${params.acceptUrl}`

    const html = await edge.render('emails/invitation', {
      inviterName: params.inviterName,
      orgName: params.orgName,
      acceptUrl: params.acceptUrl,
      branding: params.branding ?? null,
    })

    await this.#enqueue({
      to: params.to,
      subject,
      text,
      html,
      correlationId: `invitation:${params.to}:${Date.now()}`,
    })
  }

  async sendReminderInactiveAccount(params: {
    to: string
    name: string | null
    orgName: string
    branding?: BrandingEmailParams | null
  }) {
    const displayName = params.name ?? params.to
    const subject = 'Ajoutez votre premier bateau — FleetAi / Add your first boat — FleetAi'
    const text = `Bonjour ${displayName},\n\nVotre organisation ${params.orgName} n'a pas encore de bateau enregistre. Ajoutez votre flotte pour profiter de toutes les fonctionnalites.\n\nHello ${displayName},\n\nYour organisation ${params.orgName} has no boats yet. Add your fleet to unlock all features.\n\n${env.get('APP_URL')}/boats`

    const html = await edge.render('emails/reminder_inactive_account', {
      displayName,
      orgName: params.orgName,
      appUrl: env.get('APP_URL'),
      branding: params.branding ?? null,
    })

    const correlationId = `reminder-inactive-account:${params.to}:${params.orgName}`

    await this.#enqueue({
      to: params.to,
      subject,
      text,
      html,
      correlationId,
    })
  }

  async sendReminderIncompleteBoats(params: {
    to: string
    name: string | null
    boats: ReminderBoatItem[]
    branding?: BrandingEmailParams | null
  }) {
    const displayName = params.name ?? params.to
    const subject =
      'Des bateaux incomplets dans votre flotte — FleetAi / Incomplete boats in your fleet — FleetAi'
    const boatNames = params.boats.map((b) => b.name).join(', ')
    const text = `Bonjour ${displayName},\n\nLes bateaux suivants manquent d'informations importantes : ${boatNames}.\n\nHello ${displayName},\n\nThe following boats are missing key information: ${boatNames}.\n\n${env.get('APP_URL')}/boats`

    const html = await edge.render('emails/reminder_incomplete_boats', {
      displayName,
      boats: params.boats,
      appUrl: env.get('APP_URL'),
      branding: params.branding ?? null,
    })

    const correlationId = `reminder-incomplete-boats:${params.to}:${params.boats.map((b) => b.id).join('-')}`

    await this.#enqueue({
      to: params.to,
      subject,
      text,
      html,
      correlationId,
    })
  }

  async sendReminderIncompletePorts(params: {
    to: string
    name: string | null
    ports: ReminderPortItem[]
    branding?: BrandingEmailParams | null
  }) {
    const displayName = params.name ?? params.to
    const subject =
      'Des ports incomplets dans votre compte — FleetAi / Incomplete ports in your account — FleetAi'
    const portNames = params.ports.map((p) => p.name).join(', ')
    const text = `Bonjour ${displayName},\n\nLes ports suivants manquent de ville ou de pays : ${portNames}.\n\nHello ${displayName},\n\nThe following ports are missing city or country: ${portNames}.\n\n${env.get('APP_URL')}/ports`

    const html = await edge.render('emails/reminder_incomplete_ports', {
      displayName,
      ports: params.ports,
      appUrl: env.get('APP_URL'),
      branding: params.branding ?? null,
    })

    const correlationId = `reminder-incomplete-ports:${params.to}:${params.ports.map((p) => p.id).join('-')}`

    await this.#enqueue({
      to: params.to,
      subject,
      text,
      html,
      correlationId,
    })
  }

  async sendReminderInactiveLogin(params: {
    to: string
    name: string | null
    lastLoginAt: string | null
    branding?: BrandingEmailParams | null
  }) {
    const displayName = params.name ?? params.to
    const subject = 'Votre flotte vous attend — FleetAi / Your fleet is waiting — FleetAi'
    const text = `Bonjour ${displayName},\n\nVous ne vous etes pas connecte depuis plus de 30 jours. Revenez gerer votre flotte sur FleetAi.\n\nHello ${displayName},\n\nYou haven't logged in for over 30 days. Come back to manage your fleet on FleetAi.\n\n${env.get('APP_URL')}/dashboard`

    const html = await edge.render('emails/reminder_inactive_login', {
      displayName,
      appUrl: env.get('APP_URL'),
      branding: params.branding ?? null,
    })

    const correlationId = `reminder-inactive-login:${params.to}`

    await this.#enqueue({
      to: params.to,
      subject,
      text,
      html,
      correlationId,
    })
  }

  async sendReminderOverdueTasks(params: {
    to: string
    name: string | null
    tasks: ReminderTaskItem[]
    branding?: BrandingEmailParams | null
  }) {
    const displayName = params.name ?? params.to
    const subject =
      'Des taches de maintenance en retard — FleetAi / Overdue maintenance tasks — FleetAi'
    const taskTitles = params.tasks.map((t) => `${t.title} (${t.boatName})`).join(', ')
    const text = `Bonjour ${displayName},\n\nLes taches suivantes sont en retard : ${taskTitles}.\n\nHello ${displayName},\n\nThe following tasks are overdue: ${taskTitles}.\n\n${env.get('APP_URL')}/maintenance`

    const html = await edge.render('emails/reminder_overdue_tasks', {
      displayName,
      tasks: params.tasks,
      appUrl: env.get('APP_URL'),
      branding: params.branding ?? null,
    })

    const taskIds = params.tasks.map((t) => t.id).join('-')
    const correlationId = `reminder-overdue-tasks:${params.to}:${taskIds}`

    await this.#enqueue({
      to: params.to,
      subject,
      text,
      html,
      correlationId,
    })
  }

  async sendReminderEngineTasks(params: {
    to: string
    name: string | null
    tasks: ReminderTaskItem[]
    branding?: BrandingEmailParams | null
  }) {
    const displayName = params.name ?? params.to
    const subject = 'Maintenance moteur a venir — FleetAi / Upcoming engine maintenance — FleetAi'
    const taskTitles = params.tasks.map((t) => `${t.title} (${t.boatName})`).join(', ')
    const text = `Bonjour ${displayName},\n\nLes taches moteur suivantes arrivent a echeance dans 30 jours : ${taskTitles}.\n\nHello ${displayName},\n\nThe following engine tasks are due within 30 days: ${taskTitles}.\n\n${env.get('APP_URL')}/maintenance`

    const html = await edge.render('emails/reminder_engine_tasks', {
      displayName,
      tasks: params.tasks,
      appUrl: env.get('APP_URL'),
      branding: params.branding ?? null,
    })

    const taskIds = params.tasks.map((t) => t.id).join('-')
    const correlationId = `reminder-engine-tasks:${params.to}:${taskIds}`

    await this.#enqueue({
      to: params.to,
      subject,
      text,
      html,
      correlationId,
    })
  }

  async sendReminderBoatCheckTasks(params: {
    to: string
    name: string | null
    tasks: ReminderTaskItem[]
    branding?: BrandingEmailParams | null
  }) {
    const displayName = params.name ?? params.to
    const subject = 'Inspection bateau a venir — FleetAi / Upcoming boat inspection — FleetAi'
    const taskTitles = params.tasks.map((t) => `${t.title} (${t.boatName})`).join(', ')
    const text = `Bonjour ${displayName},\n\nLes inspections suivantes arrivent a echeance dans 30 jours : ${taskTitles}.\n\nHello ${displayName},\n\nThe following boat inspections are due within 30 days: ${taskTitles}.\n\n${env.get('APP_URL')}/maintenance`

    const html = await edge.render('emails/reminder_boat_check_tasks', {
      displayName,
      tasks: params.tasks,
      appUrl: env.get('APP_URL'),
      branding: params.branding ?? null,
    })

    const taskIds = params.tasks.map((t) => t.id).join('-')
    const correlationId = `reminder-boat-check-tasks:${params.to}:${taskIds}`

    await this.#enqueue({
      to: params.to,
      subject,
      text,
      html,
      correlationId,
    })
  }

  async sendStorageQuotaWarning(params: {
    to: string
    name: string | null
    percent: number
    orgName: string
    correlationSuffix: string
    branding?: BrandingEmailParams | null
  }) {
    const displayName = params.name ?? params.to
    const subject =
      params.percent >= 100
        ? 'Limite de stockage atteinte — FleetAi / Storage limit reached — FleetAi'
        : `Stockage a ${params.percent}% — FleetAi / Storage at ${params.percent}% — FleetAi`

    const text =
      params.percent >= 100
        ? `Bonjour ${displayName},\n\nVotre organisation ${params.orgName} a atteint sa limite de stockage. Vous ne pouvez plus ajouter de fichiers.\n\nHello ${displayName},\n\nYour organisation ${params.orgName} has reached its storage limit. You cannot upload new files.\n\n${env.get('APP_URL')}/settings/billing`
        : `Bonjour ${displayName},\n\nVotre organisation ${params.orgName} a atteint ${params.percent}% de sa limite de stockage.\n\nHello ${displayName},\n\nYour organisation ${params.orgName} has reached ${params.percent}% of its storage limit.\n\n${env.get('APP_URL')}/settings/billing`

    const html = await edge.render('emails/storage_quota_warning', {
      displayName,
      percent: params.percent,
      orgName: params.orgName,
      appUrl: env.get('APP_URL'),
      branding: params.branding ?? null,
    })

    const correlationId = `storage-quota-warning:${params.correlationSuffix}`

    await this.#enqueue({
      to: params.to,
      subject,
      text,
      html,
      correlationId,
    })
  }

  async sendAiTokenQuotaWarning(params: {
    to: string
    name: string | null
    percent: number
    orgName: string
    correlationSuffix: string
    branding?: BrandingEmailParams | null
  }) {
    const displayName = params.name ?? params.to
    const subject =
      params.percent >= 100
        ? 'Limite tokens IA atteinte — FleetAi / AI token limit reached — FleetAi'
        : `Tokens IA à ${params.percent}% — FleetAi / AI tokens at ${params.percent}% — FleetAi`

    const text =
      params.percent >= 100
        ? `Bonjour ${displayName},\n\nVotre organisation ${params.orgName} a atteint sa limite mensuelle de tokens IA. Les fonctionnalités IA sont indisponibles jusqu'au 1er du mois prochain.\n\nHello ${displayName},\n\nYour organisation ${params.orgName} has reached its monthly AI token limit. AI features are unavailable until the 1st of next month.\n\n${env.get('APP_URL')}/settings/billing`
        : `Bonjour ${displayName},\n\nVotre organisation ${params.orgName} a consommé ${params.percent}% de sa limite mensuelle de tokens IA.\n\nHello ${displayName},\n\nYour organisation ${params.orgName} has used ${params.percent}% of its monthly AI token limit.\n\n${env.get('APP_URL')}/settings/billing`

    const html = await edge.render('emails/ai_token_quota_warning', {
      displayName,
      percent: params.percent,
      orgName: params.orgName,
      appUrl: env.get('APP_URL'),
      branding: params.branding ?? null,
    })

    const correlationId = `ai-token-quota-warning:${params.correlationSuffix}`

    await this.#enqueue({
      to: params.to,
      subject,
      text,
      html,
      correlationId,
    })
  }

  async sendReminderDocumentExpiry(params: {
    to: string
    name: string | null
    documents: ReminderDocumentItem[]
    daysLabel: '30' | '7'
    branding?: BrandingEmailParams | null
  }) {
    const displayName = params.name ?? params.to
    const subject =
      params.daysLabel === '7'
        ? 'Documents bateau urgents (7 j) / Boat documents expiring SOON (7 d)'
        : 'Documents bateau arrivant à expiration (30 j) / Boat documents expiring soon (30 d)'

    const text = `${displayName}, ${params.documents.length} document(s) expirent dans ${params.daysLabel} jours.`

    const html = await edge.render('emails/reminder_document_expiry', {
      displayName,
      documents: params.documents,
      daysLabel: params.daysLabel,
      appUrl: env.get('APP_URL'),
      branding: params.branding ?? null,
    })

    const correlationId = `doc-expiry:${params.to}:${params.daysLabel}:${DateTime.now().toISODate()}`

    await this.#enqueue({
      to: params.to,
      subject,
      text,
      html,
      correlationId,
    })
  }

  /**
   * Rappel des certifications d'équipage à renouveler (#882), rédigé dans la
   * langue de l'admin. Une ligne par certification, la plus urgente d'abord.
   */
  async sendReminderCrewCertificationExpiry(params: {
    to: string
    name: string | null
    locale: string | null
    certifications: CrewCertificationAlert[]
    branding?: BrandingEmailParams | null
  }) {
    const i18n = i18nManager.locale(toAppLocale(params.locale))
    const displayName = params.name ?? params.to
    const count = String(params.certifications.length)
    const subject = i18n.t('crew.emails.reminder.subject', { count })
    const rows = params.certifications.map((cert) => ({
      crewMemberName: cert.crewMemberName,
      type: i18n.t(`common.navigationTitles.${cert.type}`),
      expiresAt: formatDateLong(cert.expiresAt, i18n.locale),
      delay: i18n.t('crew.emails.reminder.inDays', { days: String(cert.expiresInDays) }),
    }))
    const intro = i18n.t('crew.emails.reminder.intro', { count })
    const text = [
      i18n.t('crew.emails.reminder.greeting', { name: displayName }),
      intro,
      rows
        .map((row) => `- ${row.crewMemberName} — ${row.type} — ${row.expiresAt} (${row.delay})`)
        .join('\n'),
      `${env.get('APP_URL')}/crew`,
    ].join('\n\n')

    const html = await edge.render('emails/reminder_crew_certification_expiry', {
      i18n,
      displayName,
      intro,
      rows,
      appUrl: env.get('APP_URL'),
      branding: params.branding ?? null,
    })

    const ids = params.certifications.map((cert) => cert.certificationId).join(',')
    await this.#enqueue({
      to: params.to,
      subject,
      text,
      html,
      correlationId: `crew-cert-expiry:${params.to}:${ids}:${DateTime.now().toISODate()}`,
    })
  }

  async sendPlanDowngradeNotification(params: {
    to: string
    name: string | null
    orgName: string
    orgId: number
    fromPlan: PlanTier
    toPlan: PlanTier
    branding?: BrandingEmailParams | null
  }) {
    const displayName = params.name ?? params.to
    const subject = `Changement de plan — ${params.orgName} / Plan changed — ${params.orgName}`
    const text =
      `Bonjour ${displayName},\n\nLe plan de votre organisation ${params.orgName} a été modifié de ${params.fromPlan} vers ${params.toPlan}. Si votre usage dépasse les limites du nouveau plan, les nouveaux uploads et ajouts seront bloqués jusqu'à ce que vous réduisiez votre usage.\n\n` +
      `Hello ${displayName},\n\nYour organisation ${params.orgName} has been moved from ${params.fromPlan} to ${params.toPlan}. If your current usage exceeds the new plan limits, new uploads and additions will be blocked until you reduce your usage.\n\n${env.get('APP_URL')}/settings/billing`

    const html = await edge.render('emails/plan_downgrade', {
      displayName,
      orgName: params.orgName,
      fromPlan: params.fromPlan,
      toPlan: params.toPlan,
      appUrl: env.get('APP_URL'),
      branding: params.branding ?? null,
    })

    const yearMonth = DateTime.now().toFormat('yyyy-MM')
    const correlationId = `plan-downgrade:${params.orgId}:${params.fromPlan}:${params.toPlan}:${yearMonth}`

    await this.#enqueue({
      to: params.to,
      subject,
      text,
      html,
      correlationId,
    })
  }

  async sendModuleDeactivatedNotification(params: {
    to: string
    name: string | null
    orgName: string
    orgId: number
    module: PlanModule
    moduleName: string
    branding?: BrandingEmailParams | null
  }) {
    const displayName = params.name ?? params.to
    const subject = `Module désactivé — ${params.moduleName} / Module deactivated — ${params.moduleName}`
    const text =
      `Bonjour ${displayName},\n\nLe module ${params.moduleName} a été retiré de l'abonnement de ${params.orgName}. Vos données restent consultables en lecture seule ; la création et l'édition sont désormais bloquées.\n\n` +
      `Hello ${displayName},\n\nThe ${params.moduleName} module has been removed from ${params.orgName}'s subscription. Your data stays available in read-only mode; creating and editing are now disabled.\n\n${env.get('APP_URL')}/settings/billing`

    const html = await edge.render('emails/module_deactivated', {
      displayName,
      orgName: params.orgName,
      moduleName: params.moduleName,
      appUrl: env.get('APP_URL'),
      branding: params.branding ?? null,
    })

    const yearMonth = DateTime.now().toFormat('yyyy-MM')
    const correlationId = `module-deactivated:${params.orgId}:${params.module}:${yearMonth}`

    await this.#enqueue({
      to: params.to,
      subject,
      text,
      html,
      correlationId,
    })
  }

  /**
   * Notifie la boîte de contact FleetAi d'un message reçu depuis /contact (#450).
   */
  async sendContactMessageNotification(params: {
    to: string
    messageId: string
    subjectLabel: string
    fullName: string
    email: string
    organization: string | null
    fleetSize: string | null
    message: string
    locale: string
  }) {
    const subject = `[Contact] ${params.subjectLabel} — ${params.fullName}`
    const text = `Nouveau message de contact (${params.subjectLabel})\n\nNom : ${params.fullName}\nEmail : ${params.email}\nOrganisation : ${params.organization ?? '—'}\nTaille de flotte : ${params.fleetSize ?? '—'}\nLangue : ${params.locale}\n\n${params.message}`

    const html = await edge.render('emails/contact_message_notification', {
      subjectLabel: params.subjectLabel,
      fullName: params.fullName,
      email: params.email,
      organization: params.organization,
      fleetSize: params.fleetSize,
      // Une ligne = un <p> : le template n'a plus besoin de `white-space: pre-wrap`,
      // dont l'indentation serait réintroduite par le formatage.
      messageLines: params.message.split('\n'),
      locale: params.locale,
    })

    await this.#enqueue({
      to: params.to,
      subject,
      text,
      html,
      correlationId: `contact-message:${params.messageId}`,
    })
  }

  /**
   * Accuse réception à l'expéditeur du formulaire de contact (#450).
   */
  async sendContactMessageAck(params: {
    to: string
    messageId: string
    firstName: string
    message: string
    locale: string
  }) {
    const i18n = i18nManager.locale(toAppLocale(params.locale, 'en'))
    const subject = i18n.t('marketing.emails.contactAck.subject')
    const text = i18n.t('marketing.emails.contactAck.text', {
      firstName: params.firstName,
      message: params.message,
    })

    const html = await edge.render('emails/contact_message_ack', {
      i18n,
      firstName: params.firstName,
      messageLines: params.message.split('\n'),
      appUrl: env.get('APP_URL'),
    })

    await this.#enqueue({
      to: params.to,
      subject,
      text,
      html,
      correlationId: `contact-message-ack:${params.messageId}`,
    })
  }

  /**
   * Demande de la page publique de réservation (#881) — quatre messages sur
   * un même gabarit : `alert` au loueur, `ack` (accusé de réception),
   * `confirmed` et `declined` au client. Les messages au client portent la
   * marque blanche du loueur quand son plan la permet.
   */
  async sendPublicBookingEmail(params: PublicBookingEmailParams) {
    const i18n = i18nManager.locale(toAppLocale(params.locale, 'fr'))
    const prefix = `public.booking.emails.${params.kind}`
    const vars = {
      orgName: params.orgName,
      boatName: params.boatName,
      clientName: params.clientName,
    }
    const heading = i18n.t(`${prefix}.heading`, vars)
    const paragraphs = [i18n.t(`${prefix}.intro`, vars)]
    if (params.kind !== 'alert') paragraphs.push(i18n.t(`${prefix}.next`, vars))

    const details: { label: string; value: string }[] = [
      { label: i18n.t('public.booking.emails.labels.boat'), value: params.boatName },
      {
        label: i18n.t('public.booking.emails.labels.arrival'),
        value: formatDateLong(params.startsOn, i18n.locale),
      },
      {
        label: i18n.t('public.booking.emails.labels.departure'),
        value: formatDateLong(params.endsOn, i18n.locale),
      },
    ]
    if (params.total !== null) {
      details.push({
        label: i18n.t('public.booking.emails.labels.estimate'),
        value: formatCurrency(params.total, i18n.locale, { currency: params.currency }),
      })
    }
    if (params.kind === 'alert') {
      details.push(
        { label: i18n.t('public.booking.emails.labels.name'), value: params.clientName },
        { label: i18n.t('public.booking.emails.labels.email'), value: params.clientEmail }
      )
      if (params.clientPhone) {
        details.push({
          label: i18n.t('public.booking.emails.labels.phone'),
          value: params.clientPhone,
        })
      }
    }

    const messageLines =
      params.kind === 'alert' || params.kind === 'ack'
        ? (params.message ?? '').split('\n').filter((line) => line.trim() !== '')
        : []
    const ctaUrl = params.kind === 'alert' ? `${env.get('APP_URL')}${params.actionPath}` : null
    const footer = i18n.t(
      `public.booking.emails.footer${params.kind === 'alert' ? 'Staff' : ''}`,
      vars
    )

    const subject = i18n.t(`${prefix}.subject`, vars)
    const text = [
      heading,
      ...paragraphs,
      details.map((d) => `${d.label} : ${d.value}`).join('\n'),
      messageLines.join('\n'),
      ctaUrl ?? '',
      footer,
    ]
      .filter((part) => part !== '')
      .join('\n\n')

    const html = await edge.render('emails/public_booking', {
      i18n,
      branding: params.kind === 'alert' ? null : params.branding,
      heading,
      paragraphs,
      details,
      messageLines,
      ctaUrl,
      ctaLabel: i18n.t('public.booking.emails.alert.cta'),
      footer,
    })

    await this.#enqueue({
      to: params.to,
      subject,
      text,
      html,
      correlationId: `public-booking:${params.kind}:${params.reservationId}`,
    })
  }

  async sendInvoice(params: {
    invoiceId: number
    organizationId: number
    to: string
    locale: string
  }) {
    // Use a unique key per send to allow resends (includes timestamp component)
    const dedupKey = `invoice:${params.organizationId}:${params.invoiceId}:${Date.now()}`

    const payload = {
      invoiceId: params.invoiceId,
      organizationId: params.organizationId,
      to: params.to,
      locale: params.locale,
      dedupKey,
    }

    const { default: SendInvoiceEmail } = await import('#jobs/send_invoice_email')

    await this.dedup.enqueueUnique({
      key: dedupKey,
      jobName: SendInvoiceEmail.name,
      queue: 'emails',
      payload,
      dispatch: async (p) => {
        await SendInvoiceEmail.dispatch(p)
      },
    })
  }

  /**
   * Relance d'une facture en retard (#878). La clé est fournie par l'appelant :
   * `invoice_reminder:<id>:<palier>` pour le job quotidien (un palier ne part
   * qu'une fois), horodatée pour une relance manuelle.
   */
  async sendInvoiceReminder(params: {
    invoiceId: number
    organizationId: number
    to: string
    locale: string
    tier: number
    dedupKey: string
  }) {
    const payload = {
      invoiceId: params.invoiceId,
      organizationId: params.organizationId,
      to: params.to,
      locale: params.locale,
      tier: params.tier,
      dedupKey: params.dedupKey,
    }

    const { default: SendInvoiceReminderEmail } = await import('#jobs/send_invoice_reminder_email')

    return this.dedup.enqueueUnique({
      key: params.dedupKey,
      jobName: SendInvoiceReminderEmail.name,
      queue: 'emails',
      payload,
      dispatch: async (p) => {
        await SendInvoiceReminderEmail.dispatch(p)
      },
    })
  }

  async sendRentalContract(params: {
    contractId: number
    organizationId: number
    to: string
    locale: string
  }) {
    // Use a unique key per send to allow resends (includes timestamp component)
    const dedupKey = `rental-contract:${params.organizationId}:${params.contractId}:${Date.now()}`

    const payload = {
      contractId: params.contractId,
      organizationId: params.organizationId,
      to: params.to,
      locale: params.locale,
      dedupKey,
    }

    const { default: SendRentalContractEmail } = await import('#jobs/send_rental_contract_email')

    await this.dedup.enqueueUnique({
      key: dedupKey,
      jobName: SendRentalContractEmail.name,
      queue: 'emails',
      payload,
      dispatch: async (p) => {
        await SendRentalContractEmail.dispatch(p)
      },
    })
  }

  /** PDF d'état des lieux signé envoyé au client (#889) — renvoi possible. */
  async sendInspection(params: {
    inspectionId: number
    organizationId: number
    to: string
    locale: string
  }) {
    const dedupKey = `inspection:${params.organizationId}:${params.inspectionId}:${Date.now()}`

    const payload = { ...params, dedupKey }

    const { default: SendInspectionEmail } = await import('#jobs/send_inspection_email')

    await this.dedup.enqueueUnique({
      key: dedupKey,
      jobName: SendInspectionEmail.name,
      queue: 'emails',
      payload,
      dispatch: async (p) => {
        await SendInspectionEmail.dispatch(p)
      },
    })
  }
}
