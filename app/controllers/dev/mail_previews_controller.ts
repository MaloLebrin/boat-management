import edge from 'edge.js'
import env from '#start/env'
import type { HttpContext } from '@adonisjs/core/http'

const TEMPLATES = [
  { name: 'welcome', label: 'Bienvenue' },
  { name: 'password-reset', label: 'Reinitialisation mot de passe' },
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

export default class MailPreviewsController {
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

      case 'invitation':
        html = await edge.render('emails/invitation', {
          inviterName: 'Marie Martin',
          orgName: 'Yacht Club Bordeaux',
          acceptUrl: 'https://app.fleetai.com/invite?token=preview',
        })
        break

      case 'simulator-report-fr':
        html = await edge.render('emails/simulator_report', {
          isFr: true,
          categories: FAKE_CATEGORIES_FR,
          totalMinFormatted: '2 200 €',
          totalMaxFormatted: '3 070 €',
          appUrl,
        })
        break

      case 'simulator-report-en':
        html = await edge.render('emails/simulator_report', {
          isFr: false,
          categories: FAKE_CATEGORIES_EN,
          totalMinFormatted: '€2,200',
          totalMaxFormatted: '€3,070',
          appUrl,
        })
        break

      case 'nurturing-d3-fr':
        html = await edge.render('emails/nurturing_d3', {
          isFr: true,
          tips: FAKE_TIPS_FR,
          appUrl,
        })
        break

      case 'nurturing-d3-en':
        html = await edge.render('emails/nurturing_d3', {
          isFr: false,
          tips: FAKE_TIPS_EN,
          appUrl,
        })
        break

      case 'nurturing-d7-fr':
        html = await edge.render('emails/nurturing_d7', {
          isFr: true,
          totalMin: '2 200 €',
          totalMax: '3 070 €',
          appUrl,
        })
        break

      case 'nurturing-d7-en':
        html = await edge.render('emails/nurturing_d7', {
          isFr: false,
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

      default:
        break
    }

    if (html === null) {
      return response.status(404).send(`Template "${name}" introuvable.`)
    }

    return response.header('Content-Type', 'text/html').send(html)
  }
}
