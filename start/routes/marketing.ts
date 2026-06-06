import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const MarketingController = () => import('#controllers/marketing_controller')
const SimulatorController = () => import('#controllers/simulator_controller')

router.get('/', ({ response }) => response.redirect('/en')).as('root')

router
  .group(() => {
    router.get('/', [MarketingController, 'home']).as('marketing.en.home')
    router.get('/tarifs', [MarketingController, 'pricing']).as('marketing.en.pricing')
    router
      .get('/maintenance-cost-simulator', [MarketingController, 'simulator'])
      .as('marketing.en.simulator')
    router.get('/boat-maintenance-cost', [MarketingController, 'guide']).as('marketing.en.guide')
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
  })
  .prefix('fr')

router.get('/en/about', [MarketingController, 'about']).as('marketing.en.about')
router.get('/fr/a-propos', [MarketingController, 'about']).as('marketing.fr.about')
router.get('/contact', [MarketingController, 'contact']).as('marketing.contact')

router.post('/simulator/session', [SimulatorController, 'saveSession']).as('simulator.session')
router
  .post('/boats/from-simulator', [SimulatorController, 'createBoat'])
  .as('simulator.create_boat')
  .use(middleware.auth())
