import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { contactThrottle, publicDiagnosisThrottle, publicPartSearchThrottle } from '#start/limiter'

const MarketingController = () => import('#controllers/marketing_controller')
const MarketingFeaturesController = () => import('#controllers/marketing_features_controller')
const ContactMessagesController = () => import('#controllers/contact_messages_controller')
const SimulatorController = () => import('#controllers/simulator_controller')
const SimulatorLeadController = () => import('#controllers/simulator_lead_controller')
const PublicDiagnosisController = () => import('#controllers/public_diagnosis_controller')
const PublicPartSearchController = () => import('#controllers/public_part_search_controller')

router.get('/', ({ response }) => response.redirect('/en')).as('home')

router
  .group(() => {
    router.get('/', [MarketingController, 'home']).as('marketing.en.home')
    router.get('/pricing', [MarketingController, 'pricing']).as('marketing.en.pricing')
    // #475 — ancien slug FR de la page tarifs EN : redirection permanente vers /en/pricing
    // pour ne pas perdre le référencement acquis sur /en/tarifs.
    router
      .get('/tarifs', ({ response }) => response.redirect('/en/pricing', false, 301))
      .as('marketing.en.pricing_legacy')
    // Pages fonctionnalité dédiées (compréhension acheteur + SEO) — slugs à
    // mots-clés, alignés sur MARKETING_SLUGS (shared/helpers/locale_path.ts).
    router
      .get('/boat-maintenance-log', [MarketingFeaturesController, 'maintenance'])
      .as('marketing.en.maintenance')
    router
      .get('/boat-fleet-management', [MarketingFeaturesController, 'fleet'])
      .as('marketing.en.fleet')
    router
      .get('/ai-boat-assistant', [MarketingFeaturesController, 'aiAssistant'])
      .as('marketing.en.aiAssistant')
    router
      .get('/maintenance-cost-simulator', [MarketingController, 'simulator'])
      .as('marketing.en.simulator')
    router.get('/boat-maintenance-cost', [MarketingController, 'guide']).as('marketing.en.guide')
    router
      .get('/engine-diagnosis-ai', [PublicDiagnosisController, 'show'])
      .as('marketing.en.diagnosisAi')
    router
      .get('/engine-part-finder-ai', [PublicPartSearchController, 'show'])
      .as('marketing.en.partsAi')
    router.get('/privacy', [MarketingController, 'privacy']).as('marketing.en.privacy')
    router.get('/terms', [MarketingController, 'terms']).as('marketing.en.terms')
    router.get('/sales-terms', [MarketingController, 'salesTerms']).as('marketing.en.sales_terms')
    router
      .get('/legal-notice', [MarketingController, 'legalNotice'])
      .as('marketing.en.legal_notice')
  })
  .prefix('en')

router
  .group(() => {
    router.get('/', [MarketingController, 'home']).as('marketing.fr.home')
    router.get('/tarifs', [MarketingController, 'pricing']).as('marketing.fr.pricing')
    router
      .get('/carnet-entretien-bateau', [MarketingFeaturesController, 'maintenance'])
      .as('marketing.fr.maintenance')
    router
      .get('/gestion-flotte-bateaux', [MarketingFeaturesController, 'fleet'])
      .as('marketing.fr.fleet')
    router
      .get('/assistant-ia-bateau', [MarketingFeaturesController, 'aiAssistant'])
      .as('marketing.fr.aiAssistant')
    router
      .get('/simulateur-cout-entretien', [MarketingController, 'simulator'])
      .as('marketing.fr.simulator')
    router.get('/cout-entretien-bateau', [MarketingController, 'guide']).as('marketing.fr.guide')
    router
      .get('/diagnostic-panne-ia', [PublicDiagnosisController, 'show'])
      .as('marketing.fr.diagnosisAi')
    router
      .get('/reference-piece-moteur-ia', [PublicPartSearchController, 'show'])
      .as('marketing.fr.partsAi')
    router.get('/confidentialite', [MarketingController, 'privacy']).as('marketing.fr.privacy')
    router.get('/cgu', [MarketingController, 'terms']).as('marketing.fr.terms')
    router.get('/cgv', [MarketingController, 'salesTerms']).as('marketing.fr.sales_terms')
    router
      .get('/mentions-legales', [MarketingController, 'legalNotice'])
      .as('marketing.fr.legal_notice')
  })
  .prefix('fr')

router.get('/en/about', [MarketingController, 'about']).as('marketing.en.about')
router.get('/fr/a-propos', [MarketingController, 'about']).as('marketing.fr.about')
router.get('/en/contact', [MarketingController, 'contact']).as('marketing.en.contact')
router.get('/fr/contact', [MarketingController, 'contact']).as('marketing.fr.contact')
router.get('/contact', [MarketingController, 'contact']).as('marketing.contact')

// Soumission du formulaire de contact (#450) — une seule route POST, la page
// contact la cible quelle que soit la locale de l'URL de rendu.
router
  .post('/contact', [ContactMessagesController, 'store'])
  .as('marketing.contact.store')
  .use(contactThrottle)

router.post('/simulator/session', [SimulatorController, 'saveSession']).as('simulator.session')
router
  .post('/boats/from-simulator', [SimulatorController, 'createBoat'])
  .as('simulator.create_boat')
  .use(middleware.auth())

router.post('/simulator/lead', [SimulatorLeadController, 'store']).as('simulator.lead')

// Chat IA public de diagnostic (#602) — POST non localisés (pattern /contact),
// la page les cible quelle que soit la locale de l'URL de rendu.
router
  .post('/diagnosis-ai/conversations', [PublicDiagnosisController, 'start'])
  .as('public_diagnosis.start')
  .use(publicDiagnosisThrottle)
router
  .post('/diagnosis-ai/conversations/:token/messages', [PublicDiagnosisController, 'message'])
  .as('public_diagnosis.message')
  .use(publicDiagnosisThrottle)

// Chat IA public de recherche de références de pièces (#634, Phase 2) — mêmes
// conventions : POST non localisés, throttle dédié.
router
  .post('/parts-ai/conversations', [PublicPartSearchController, 'start'])
  .as('public_part_search.start')
  .use(publicPartSearchThrottle)
router
  .post('/parts-ai/conversations/:token/messages', [PublicPartSearchController, 'message'])
  .as('public_part_search.message')
  .use(publicPartSearchThrottle)

const SimulatorShareController = () => import('#controllers/simulator_share_controller')

router.post('/simulator/share', [SimulatorShareController, 'store']).as('simulator.share.store')
router.get('/simulateur/r/:token', [SimulatorShareController, 'show']).as('simulator.share.show.fr')
router.get('/simulator/r/:token', [SimulatorShareController, 'show']).as('simulator.share.show.en')
