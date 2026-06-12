import edge from 'edge.js'
import SendEmail, { type SendEmailPayload } from '#jobs/send_email'
import type SimulatorLead from '#models/simulator_lead'
import QueueDedupService from '#services/queue_dedup_service'
import type { ReminderBoatItem, ReminderPortItem, ReminderTaskItem } from '#shared/types/reminder'
import type {
  SimulatorBoatInput,
  SimulatorBoatType,
  SimulatorWearLevel,
  SimulatorWinteringZone,
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
    const appUrl = env.get('APP_URL')

    // Email J+3 — 3 tips to reduce maintenance costs
    const subjectD3 = isFr
      ? "3 conseils pour reduire les couts d'entretien de votre bateau"
      : '3 tips to reduce your boat maintenance costs'

    const textD3 = isFr
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

    const htmlD3 = await edge.render('emails/nurturing_d3', {
      isFr,
      tips,
      appUrl,
    })

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
      ? `Votre bateau vous coutera entre ${totalMinFormatted} et ${totalMaxFormatted} par an en entretien. FleetAi vous aide a planifier et anticiper ces depenses.\n\nCreez votre compte: ${appUrl}/signup`
      : `Your boat will cost between ${totalMinFormatted} and ${totalMaxFormatted} per year in maintenance. FleetAi helps you plan and anticipate these expenses.\n\nCreate your account: ${appUrl}/signup`

    const htmlD7 = await edge.render('emails/nurturing_d7', {
      isFr,
      totalMin: totalMinFormatted,
      totalMax: totalMaxFormatted,
      appUrl,
    })

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
}
