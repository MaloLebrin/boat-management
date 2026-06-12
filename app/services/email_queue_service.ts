import SendEmail, { type SendEmailPayload } from '#jobs/send_email'
import { buildInvitationHtml } from '#mails/templates/invitation'
import { buildNurturingD3Html } from '#mails/templates/nurturing_d3'
import { buildNurturingD7Html } from '#mails/templates/nurturing_d7'
import { buildPasswordResetHtml } from '#mails/templates/password_reset'
import { buildReminderBoatCheckTasksHtml } from '#mails/templates/reminder_boat_check_tasks'
import { buildReminderEngineTasksHtml } from '#mails/templates/reminder_engine_tasks'
import { buildReminderInactiveAccountHtml } from '#mails/templates/reminder_inactive_account'
import { buildReminderInactiveLoginHtml } from '#mails/templates/reminder_inactive_login'
import { buildReminderIncompleteBoatsHtml } from '#mails/templates/reminder_incomplete_boats'
import { buildReminderIncompletePortsHtml } from '#mails/templates/reminder_incomplete_ports'
import { buildReminderOverdueTasksHtml } from '#mails/templates/reminder_overdue_tasks'
import { buildSimulatorReportHtml } from '#mails/templates/simulator_report'
import { buildWelcomeHtml } from '#mails/templates/welcome'
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

  async sendWelcome(params: { to: string; name: string | null }) {
    const displayName = params.name || params.to
    const subject = 'Bienvenue sur FleetAi / Welcome to FleetAi'
    const text = `Bonjour ${displayName},\n\nBienvenue sur FleetAi, votre plateforme de gestion de flotte.\n\nHello ${displayName},\n\nWelcome to FleetAi, your fleet management platform.\n\nAccess your dashboard: /dashboard`

    const html = buildWelcomeHtml(displayName)

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

    const html = buildPasswordResetHtml(params.resetUrl)

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

    const html = buildInvitationHtml(params.inviterName, params.orgName, params.acceptUrl)

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

    const html = buildSimulatorReportHtml(breakdown, isFr)

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

  async sendSimulatorNurturing(lead: SimulatorLead) {
    const isFr = lead.locale === 'fr'

    // Email J+3 — 3 tips to reduce maintenance costs
    const subjectD3 = isFr
      ? "3 conseils pour reduire les couts d'entretien de votre bateau"
      : '3 tips to reduce your boat maintenance costs'

    const textD3 = isFr
      ? `3 conseils pour reduire vos couts d'entretien bateau\n\nCreez votre compte: ${env.get('APP_URL')}/signup`
      : `3 tips to reduce your boat maintenance costs\n\nCreate your account: ${env.get('APP_URL')}/signup`

    const htmlD3 = buildNurturingD3Html(isFr)

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

    const htmlD7 = buildNurturingD7Html(totalMinFormatted, totalMaxFormatted, isFr)

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

  async sendReminderInactiveAccount(params: { to: string; name: string | null; orgName: string }) {
    const displayName = params.name ?? params.to
    const subject = 'Ajoutez votre premier bateau — FleetAi / Add your first boat — FleetAi'
    const text = `Bonjour ${displayName},\n\nVotre organisation ${params.orgName} n'a pas encore de bateau enregistre. Ajoutez votre flotte pour profiter de toutes les fonctionnalites.\n\nHello ${displayName},\n\nYour organisation ${params.orgName} has no boats yet. Add your fleet to unlock all features.\n\n${env.get('APP_URL')}/boats`

    const html = buildReminderInactiveAccountHtml(displayName, params.orgName)
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

    const html = buildReminderIncompleteBoatsHtml(displayName, params.boats)
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

    const html = buildReminderIncompletePortsHtml(displayName, params.ports)
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

    const html = buildReminderInactiveLoginHtml(displayName)
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

    const html = buildReminderOverdueTasksHtml(displayName, params.tasks)
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

    const html = buildReminderEngineTasksHtml(displayName, params.tasks)
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

    const html = buildReminderBoatCheckTasksHtml(displayName, params.tasks)
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

  previewTemplate(name: string): string | null {
    const fakeTasks = [
      { id: 1, title: 'Vidange moteur', boatName: 'Le Téméraire', dueAt: '2026-06-15' },
      { id: 2, title: 'Contrôle extinction', boatName: 'Albatros II', dueAt: null },
    ]
    const fakeBoats = [
      { id: 1, name: 'Le Téméraire' },
      { id: 2, name: 'Albatros II' },
    ]
    const fakePorts = [
      { id: 1, name: 'Port de La Rochelle' },
      { id: 2, name: 'Port Vieux-Boucau' },
    ]
    const fakeBreakdown = {
      categories: [
        { key: 'hull', minCost: 900, maxCost: 1300 },
        { key: 'engine', minCost: 700, maxCost: 900 },
        { key: 'safety', minCost: 250, maxCost: 350 },
        { key: 'electrical', minCost: 200, maxCost: 300 },
        { key: 'mooring', minCost: 150, maxCost: 220 },
      ],
      totalMin: 2200,
      totalMax: 3070,
    }

    switch (name) {
      case 'welcome':
        return buildWelcomeHtml('Jean Dupont')
      case 'password-reset':
        return buildPasswordResetHtml('https://app.fleetai.com/reset?token=preview')
      case 'invitation':
        return buildInvitationHtml(
          'Marie Martin',
          'Yacht Club Bordeaux',
          'https://app.fleetai.com/invite?token=preview'
        )
      case 'simulator-report-fr':
        return buildSimulatorReportHtml(fakeBreakdown, true)
      case 'simulator-report-en':
        return buildSimulatorReportHtml(fakeBreakdown, false)
      case 'nurturing-d3-fr':
        return buildNurturingD3Html(true)
      case 'nurturing-d3-en':
        return buildNurturingD3Html(false)
      case 'nurturing-d7-fr':
        return buildNurturingD7Html('2 200 €', '3 070 €', true)
      case 'nurturing-d7-en':
        return buildNurturingD7Html('€2,200', '€3,070', false)
      case 'reminder-inactive-account':
        return buildReminderInactiveAccountHtml('Jean Dupont', 'Yacht Club Bordeaux')
      case 'reminder-incomplete-boats':
        return buildReminderIncompleteBoatsHtml('Jean Dupont', fakeBoats)
      case 'reminder-incomplete-ports':
        return buildReminderIncompletePortsHtml('Jean Dupont', fakePorts)
      case 'reminder-inactive-login':
        return buildReminderInactiveLoginHtml('Jean Dupont')
      case 'reminder-overdue-tasks':
        return buildReminderOverdueTasksHtml('Jean Dupont', fakeTasks)
      case 'reminder-engine-tasks':
        return buildReminderEngineTasksHtml('Jean Dupont', fakeTasks)
      case 'reminder-boat-check-tasks':
        return buildReminderBoatCheckTasksHtml('Jean Dupont', fakeTasks)
      default:
        return null
    }
  }

  listTemplates(): { name: string; label: string }[] {
    return [
      { name: 'welcome', label: 'Bienvenue' },
      { name: 'password-reset', label: 'Réinitialisation mot de passe' },
      { name: 'invitation', label: 'Invitation organisation' },
      { name: 'simulator-report-fr', label: 'Rapport simulateur (FR)' },
      { name: 'simulator-report-en', label: 'Rapport simulateur (EN)' },
      { name: 'nurturing-d3-fr', label: 'Nurturing J+3 (FR)' },
      { name: 'nurturing-d3-en', label: 'Nurturing J+3 (EN)' },
      { name: 'nurturing-d7-fr', label: 'Nurturing J+7 (FR)' },
      { name: 'nurturing-d7-en', label: 'Nurturing J+7 (EN)' },
      { name: 'reminder-inactive-account', label: 'Relance — compte sans bateau' },
      { name: 'reminder-incomplete-boats', label: 'Relance — bateaux incomplets' },
      { name: 'reminder-incomplete-ports', label: 'Relance — ports incomplets' },
      { name: 'reminder-inactive-login', label: 'Relance — inactivité connexion' },
      { name: 'reminder-overdue-tasks', label: 'Relance — tâches en retard' },
      { name: 'reminder-engine-tasks', label: 'Relance — échéances moteur' },
      { name: 'reminder-boat-check-tasks', label: 'Relance — vérifications bateau' },
    ]
  }
}
