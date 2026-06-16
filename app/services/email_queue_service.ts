import edge from 'edge.js'
import SendEmail, { type SendEmailPayload } from '#jobs/send_email'
import QueueDedupService from '#services/queue_dedup_service'
import type { ReminderBoatItem, ReminderPortItem, ReminderTaskItem } from '#shared/types/reminder'
import type { PlanTier } from '#shared/types/plan'
import env from '#start/env'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

@inject()
export default class EmailQueueService {
  constructor(private dedup: QueueDedupService) {}

  async sendWelcome(params: { to: string; name: string | null }) {
    const displayName = params.name || params.to
    const subject = 'Bienvenue sur FleetAi / Welcome to FleetAi'
    const text = `Bonjour ${displayName},\n\nBienvenue sur FleetAi, votre plateforme de gestion de flotte.\n\nHello ${displayName},\n\nWelcome to FleetAi, your fleet management platform.\n\nAccess your dashboard: /dashboard`

    const html = await edge.render('emails/welcome', {
      displayName,
      appUrl: env.get('APP_URL'),
    })

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

  async sendPasswordReset(params: { to: string; resetUrl: string }) {
    const subject = 'Reset your password / Reinitialisation de mot de passe'
    const text = `Click here to reset your password: ${params.resetUrl}\n\nCliquez ici pour reinitialiser votre mot de passe : ${params.resetUrl}`

    const html = await edge.render('emails/password_reset', {
      resetUrl: params.resetUrl,
    })

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

  async sendInvitation(params: {
    to: string
    inviterName: string | null
    orgName: string
    acceptUrl: string
  }) {
    const subject = `You've been invited to join ${params.orgName} / Vous avez ete invite a rejoindre ${params.orgName}`
    const inviterDisplay = params.inviterName ?? 'A team member'
    const text = `${inviterDisplay} has invited you to join ${params.orgName} on FleetAi.\n\nClick here to accept: ${params.acceptUrl}\n\n${inviterDisplay} vous a invite a rejoindre ${params.orgName} sur FleetAi.\n\nCliquez ici pour accepter : ${params.acceptUrl}`

    const html = await edge.render('emails/invitation', {
      inviterName: params.inviterName,
      orgName: params.orgName,
      acceptUrl: params.acceptUrl,
    })

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

  async sendReminderInactiveAccount(params: { to: string; name: string | null; orgName: string }) {
    const displayName = params.name ?? params.to
    const subject = 'Ajoutez votre premier bateau — FleetAi / Add your first boat — FleetAi'
    const text = `Bonjour ${displayName},\n\nVotre organisation ${params.orgName} n'a pas encore de bateau enregistre. Ajoutez votre flotte pour profiter de toutes les fonctionnalites.\n\nHello ${displayName},\n\nYour organisation ${params.orgName} has no boats yet. Add your fleet to unlock all features.\n\n${env.get('APP_URL')}/boats`

    const html = await edge.render('emails/reminder_inactive_account', {
      displayName,
      orgName: params.orgName,
      appUrl: env.get('APP_URL'),
    })

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

    const html = await edge.render('emails/reminder_incomplete_boats', {
      displayName,
      boats: params.boats,
      appUrl: env.get('APP_URL'),
    })

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

    const html = await edge.render('emails/reminder_incomplete_ports', {
      displayName,
      ports: params.ports,
      appUrl: env.get('APP_URL'),
    })

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

    const html = await edge.render('emails/reminder_inactive_login', {
      displayName,
      appUrl: env.get('APP_URL'),
    })

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

    const html = await edge.render('emails/reminder_overdue_tasks', {
      displayName,
      tasks: params.tasks,
      appUrl: env.get('APP_URL'),
    })

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

    const html = await edge.render('emails/reminder_engine_tasks', {
      displayName,
      tasks: params.tasks,
      appUrl: env.get('APP_URL'),
    })

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

    const html = await edge.render('emails/reminder_boat_check_tasks', {
      displayName,
      tasks: params.tasks,
      appUrl: env.get('APP_URL'),
    })

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

  async sendStorageQuotaWarning(params: {
    to: string
    name: string | null
    percent: number
    orgName: string
    correlationSuffix: string
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
    })

    const correlationId = `storage-quota-warning:${params.correlationSuffix}`

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

  async sendPlanDowngradeNotification(params: {
    to: string
    name: string | null
    orgName: string
    orgId: number
    fromPlan: PlanTier
    toPlan: PlanTier
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
    })

    const yearMonth = DateTime.now().toFormat('yyyy-MM')
    const correlationId = `plan-downgrade:${params.orgId}:${params.fromPlan}:${params.toPlan}:${yearMonth}`

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
}
