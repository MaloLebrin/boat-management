import router from '@adonisjs/core/services/router'

const MarketingController = () => import('#controllers/marketing_controller')

router.get('/', ({ response }) => response.redirect('/en')).as('root')

router
  .group(() => {
    router.get('/', [MarketingController, 'home']).as('marketing.en.home')
    router.get('/tarifs', [MarketingController, 'pricing']).as('marketing.en.pricing')
  })
  .prefix('en')

router
  .group(() => {
    router.get('/', [MarketingController, 'home']).as('marketing.fr.home')
    router.get('/tarifs', [MarketingController, 'pricing']).as('marketing.fr.pricing')
  })
  .prefix('fr')

router.get('/en/about', [MarketingController, 'about']).as('marketing.en.about')
router.get('/fr/a-propos', [MarketingController, 'about']).as('marketing.fr.about')
router.get('/contact', [MarketingController, 'contact']).as('marketing.contact')
