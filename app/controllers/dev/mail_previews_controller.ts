import edge from 'edge.js'
import i18nManager from '@adonisjs/i18n/services/main'
import { EMAIL_VERIFICATION_TOKEN_TTL_HOURS } from '#shared/constants/email_verification'
import env from '#start/env'
import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import FleetDigestMailService from '#services/fleet_digest_mail_service'
import type { MonthlyFleetReport, WeeklyFleetDigest } from '#shared/types/fleet_digest'

const TEMPLATES = [
  { name: 'welcome', label: 'Bienvenue' },
  { name: 'password-reset', label: 'Reinitialisation mot de passe' },
  { name: 'email-verification', label: "Verification d'adresse" },
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
  { name: 'reminder-inactive-login', label: 'Relance — inactivite connexion' },
  { name: 'reminder-overdue-tasks', label: 'Relance — taches en retard' },
  { name: 'reminder-engine-tasks', label: 'Relance — echeances moteur' },
  { name: 'reminder-boat-check-tasks', label: 'Relance — verifications bateau' },
  { name: 'fleet-weekly-digest-fr', label: 'Synthese hebdomadaire de flotte (FR)' },
  { name: 'fleet-weekly-digest-en', label: 'Synthese hebdomadaire de flotte (EN)' },
  { name: 'fleet-monthly-report-fr', label: 'Rapport mensuel de flotte (FR)' },
  { name: 'fleet-monthly-report-en', label: 'Rapport mensuel de flotte (EN)' },
]

const FAKE_TASKS = [
  { id: 1, title: 'Vidange moteur', boatName: 'Le Temeraire', dueAt: '2026-06-15' },
  { id: 2, title: 'Controle extinction', boatName: 'Albatros II', dueAt: null },
]
const FAKE_BOATS = [
  { id: 1, name: 'Le Temeraire' },
  { id: 2, name: 'Albatros II' },
]
const FAKE_PORTS = [
  { id: 1, name: 'Port de La Rochelle' },
  { id: 2, name: 'Port Vieux-Boucau' },
]
const FAKE_CATEGORIES_FR = [
  { key: 'hull', label: 'Coque', minFormatted: '900 €', maxFormatted: '1 300 €' },
  { key: 'engine', label: 'Moteur', minFormatted: '700 €', maxFormatted: '900 €' },
  { key: 'safety', label: 'Securite', minFormatted: '250 €', maxFormatted: '350 €' },
  { key: 'electrical', label: 'Electrique', minFormatted: '200 €', maxFormatted: '300 €' },
  { key: 'mooring', label: 'Mouillage', minFormatted: '150 €', maxFormatted: '220 €' },
]
const FAKE_CATEGORIES_EN = [
  { key: 'hull', label: 'Hull', minFormatted: '€900', maxFormatted: '€1,300' },
  { key: 'engine', label: 'Engine', minFormatted: '€700', maxFormatted: '€900' },
  { key: 'safety', label: 'Safety', minFormatted: '€250', maxFormatted: '€350' },
  { key: 'electrical', label: 'Electrical', minFormatted: '€200', maxFormatted: '€300' },
  { key: 'mooring', label: 'Mooring', minFormatted: '€150', maxFormatted: '€220' },
]
const FAKE_TIPS_FR = [
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
const FAKE_TIPS_EN = [
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

// Rapports de flotte par e-mail (#871).
const ORGANIZATION = { id: 0, name: 'Yacht Club Bordeaux', currency: 'EUR' } as const

const PREVIEW_WEEKLY_DIGEST: WeeklyFleetDigest = {
  organization: ORGANIZATION,
  week: '2026-W42',
  upcoming: { from: '2026-10-12', to: '2026-10-18' },
  past: { from: '2026-10-05', to: '2026-10-11' },
  overdueTasks: {
    total: 7,
    items: [
      { id: 1, title: 'Vidange moteur', boatId: 1, boatName: 'Le Temeraire', dueAt: '2026-10-02' },
      {
        id: 2,
        title: 'Changer les anodes',
        boatId: 2,
        boatName: 'Albatros II',
        dueAt: '2026-10-08',
      },
    ],
  },
  upcomingTasks: {
    total: 1,
    items: [
      {
        id: 3,
        title: 'Révision du gréement',
        boatId: 1,
        boatName: 'Le Temeraire',
        dueAt: '2026-10-15',
      },
    ],
  },
  openIncidents: {
    total: 1,
    items: [
      {
        id: 4,
        boatId: 2,
        boatName: 'Albatros II',
        type: 'collision',
        status: 'open',
        occurredAt: '2026-10-09',
      },
    ],
  },
  expiring: {
    total: 2,
    items: [
      {
        kind: 'document',
        id: 5,
        boatId: 1,
        boatName: 'Le Temeraire',
        type: 'insurance',
        customLabel: null,
        expiresAt: '2026-10-20',
        expired: false,
      },
      {
        kind: 'safety_equipment',
        id: 6,
        boatId: 2,
        boatName: 'Albatros II',
        type: 'flare',
        customLabel: null,
        expiresAt: '2026-10-01',
        expired: true,
      },
    ],
  },
  reservations: {
    total: 1,
    items: [
      {
        id: 7,
        boatId: 1,
        boatName: 'Le Temeraire',
        clientName: 'Camille Martin',
        startsAt: '2026-10-16',
        endsAt: '2026-10-18',
        status: 'confirmed',
      },
    ],
  },
  expenses: {
    maintenance: 420,
    fuel: 185.5,
    documents: 0,
    port: 90,
    equipment: 0,
    entries: 0,
    total: 695.5,
  },
  overdueInvoices: {
    total: 1,
    items: [
      {
        id: 8,
        number: 'F-2026-0042',
        clientName: 'Camille Martin',
        total: 1250,
        dueAt: '2026-10-01',
      },
    ],
  },
}

const PREVIEW_MONTHLY_REPORT: MonthlyFleetReport = {
  organization: ORGANIZATION,
  month: '2026-09',
  period: { preset: 'month', from: '2026-09-01', to: '2026-09-30', days: 30 },
  costs: {
    maintenance: 1840,
    fuel: 620,
    documents: 0,
    port: 450,
    equipment: 310,
    entries: 75,
    total: 3295,
  },
  previousCosts: 2710,
  topCategories: [
    { category: 'maintenance', amount: 1840 },
    { category: 'fuel', amount: 620 },
    { category: 'port', amount: 450 },
  ],
  engineHours: 64.5,
  distanceNm: 412,
  maintenance: { planned: 6, completed: 5, performed: 9 },
  rental: { revenue: 8400, rentalDays: 31, occupancyRate: 52 },
  boats: [
    {
      boatId: 1,
      boatName: 'Le Temeraire',
      costs: 2100,
      engineHours: 40,
      rentalRevenue: 5200,
      occupancyRate: 60,
    },
    {
      boatId: 2,
      boatName: 'Albatros II',
      costs: 1195,
      engineHours: 24.5,
      rentalRevenue: 3200,
      occupancyRate: 43,
    },
  ],
}

@inject()
export default class MailPreviewsController {
  constructor(private fleetDigestMail: FleetDigestMailService) {}

  index({ response }: HttpContext) {
    const links = TEMPLATES.map(
      (t) =>
        `<li style="margin:8px 0;"><a href="/dev/mails/${t.name}" style="color:#1e3a5f;text-decoration:none;font-size:15px;">
            ${t.label}
            <span style="color:#aaa;font-size:12px;margin-left:8px;">${t.name}</span>
          </a></li>`
    ).join('')

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dev — Apercu des emails</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 700px; margin: 60px auto; padding: 0 20px; color: #333; }
    h1 { font-size: 22px; color: #1e3a5f; margin-bottom: 6px; }
    p { color: #777; font-size: 13px; margin-bottom: 24px; }
    ul { list-style: none; padding: 0; border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
    li { padding: 12px 16px; border-bottom: 1px solid #f0f0f0; }
    li:last-child { border-bottom: none; }
    li:hover { background: #f9f9f9; }
    a { display: block; }
  </style>
</head>
<body>
  <h1>Apercu des templates email</h1>
  <p>Environnement de developpement uniquement — non disponible en production.</p>
  <ul>${links}</ul>
</body>
</html>`

    return response.header('Content-Type', 'text/html').send(html)
  }

  async show({ params, response }: HttpContext) {
    const appUrl = env.get('APP_URL')
    const name = params.name as string
    let html: string | null = null

    switch (name) {
      case 'welcome':
        html = await edge.render('emails/welcome', {
          displayName: 'Jean Dupont',
          appUrl,
        })
        break

      case 'password-reset':
        html = await edge.render('emails/password_reset', {
          resetUrl: 'https://app.fleetai.com/reset?token=preview',
        })
        break

      case 'email-verification':
        html = await edge.render('emails/email_verification', {
          verificationUrl: 'https://app.fleetai.com/verify-email?token=preview',
          ttlHours: EMAIL_VERIFICATION_TOKEN_TTL_HOURS,
        })
        break

      case 'invitation':
        html = await edge.render('emails/invitation', {
          inviterName: 'Marie Martin',
          orgName: 'Yacht Club Bordeaux',
          acceptUrl: 'https://app.fleetai.com/invite?token=preview',
        })
        break

      case 'simulator-report-fr':
        html = await edge.render('emails/simulator_report', {
          i18n: i18nManager.locale('fr'),
          categories: FAKE_CATEGORIES_FR,
          totalMinFormatted: '2 200 €',
          totalMaxFormatted: '3 070 €',
          appUrl,
        })
        break

      case 'simulator-report-en':
        html = await edge.render('emails/simulator_report', {
          i18n: i18nManager.locale('en'),
          categories: FAKE_CATEGORIES_EN,
          totalMinFormatted: '€2,200',
          totalMaxFormatted: '€3,070',
          appUrl,
        })
        break

      case 'nurturing-d3-fr':
        html = await edge.render('emails/nurturing_d3', {
          i18n: i18nManager.locale('fr'),
          tips: FAKE_TIPS_FR,
          appUrl,
        })
        break

      case 'nurturing-d3-en':
        html = await edge.render('emails/nurturing_d3', {
          i18n: i18nManager.locale('en'),
          tips: FAKE_TIPS_EN,
          appUrl,
        })
        break

      case 'nurturing-d7-fr':
        html = await edge.render('emails/nurturing_d7', {
          i18n: i18nManager.locale('fr'),
          totalMin: '2 200 €',
          totalMax: '3 070 €',
          appUrl,
        })
        break

      case 'nurturing-d7-en':
        html = await edge.render('emails/nurturing_d7', {
          i18n: i18nManager.locale('en'),
          totalMin: '€2,200',
          totalMax: '€3,070',
          appUrl,
        })
        break

      case 'reminder-inactive-account':
        html = await edge.render('emails/reminder_inactive_account', {
          displayName: 'Jean Dupont',
          orgName: 'Yacht Club Bordeaux',
          appUrl,
        })
        break

      case 'reminder-incomplete-boats':
        html = await edge.render('emails/reminder_incomplete_boats', {
          displayName: 'Jean Dupont',
          boats: FAKE_BOATS,
          appUrl,
        })
        break

      case 'reminder-incomplete-ports':
        html = await edge.render('emails/reminder_incomplete_ports', {
          displayName: 'Jean Dupont',
          ports: FAKE_PORTS,
          appUrl,
        })
        break

      case 'reminder-inactive-login':
        html = await edge.render('emails/reminder_inactive_login', {
          displayName: 'Jean Dupont',
          appUrl,
        })
        break

      case 'reminder-overdue-tasks':
        html = await edge.render('emails/reminder_overdue_tasks', {
          displayName: 'Jean Dupont',
          tasks: FAKE_TASKS,
          appUrl,
        })
        break

      case 'reminder-engine-tasks':
        html = await edge.render('emails/reminder_engine_tasks', {
          displayName: 'Jean Dupont',
          tasks: FAKE_TASKS,
          appUrl,
        })
        break

      case 'reminder-boat-check-tasks':
        html = await edge.render('emails/reminder_boat_check_tasks', {
          displayName: 'Jean Dupont',
          tasks: FAKE_TASKS,
          appUrl,
        })
        break

      case 'fleet-weekly-digest-fr':
      case 'fleet-weekly-digest-en':
      case 'fleet-monthly-report-fr':
      case 'fleet-monthly-report-en': {
        const context = {
          to: 'jean@example.com',
          name: 'Jean Dupont',
          locale: name.slice(-2),
          branding: null,
          unsubscribeUrl: `${appUrl}/reports/digest/unsubscribe/preview`,
        }
        const rendered = name.startsWith('fleet-weekly')
          ? await this.fleetDigestMail.renderWeekly(PREVIEW_WEEKLY_DIGEST, context)
          : await this.fleetDigestMail.renderMonthly(PREVIEW_MONTHLY_REPORT, context)
        html = rendered.html
        break
      }

      default:
        break
    }

    if (html === null) {
      return response.status(404).send(`Template "${name}" introuvable.`)
    }

    return response.header('Content-Type', 'text/html').send(html)
  }
}
