import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { contactThrottle, publicDiagnosisThrottle } from '#start/limiter'

const MarketingController = () => import('#controllers/marketing_controller')
const ContactMessagesController = () => import('#controllers/contact_messages_controller')
const SimulatorController = () => import('#controllers/simulator_controller')
const SimulatorLeadController = () => import('#controllers/simulator_lead_controller')
const PublicDiagnosisController = () => import('#controllers/public_diagnosis_controller')

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
    router
      .get('/maintenance-cost-simulator', [MarketingController, 'simulator'])
      .as('marketing.en.simulator')
    router.get('/boat-maintenance-cost', [MarketingController, 'guide']).as('marketing.en.guide')
    router
      .get('/engine-diagnosis-ai', [PublicDiagnosisController, 'show'])
      .as('marketing.en.diagnosisAi')
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
      .get('/simulateur-cout-entretien', [MarketingController, 'simulator'])
      .as('marketing.fr.simulator')
    router.get('/cout-entretien-bateau', [MarketingController, 'guide']).as('marketing.fr.guide')
    router
      .get('/diagnostic-panne-ia', [PublicDiagnosisController, 'show'])
      .as('marketing.fr.diagnosisAi')
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

const SimulatorShareController = () => import('#controllers/simulator_share_controller')

router.post('/simulator/share', [SimulatorShareController, 'store']).as('simulator.share.store')
router.get('/simulateur/r/:token', [SimulatorShareController, 'show']).as('simulator.share.show.fr')
router.get('/simulator/r/:token', [SimulatorShareController, 'show']).as('simulator.share.show.en')
