import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

// Périodes tarifaires : tout le domaine (lecture comprise) demande le module
// Location — aucun accès résiduel en lecture seule ici.
router
  .group(() => {
    router.get('pricing/seasons', [controllers.PricingSeasons, 'index']).as('pricingSeasons.index')
    router.post('pricing/seasons', [controllers.PricingSeasons, 'store']).as('pricingSeasons.store')
    router
      .put('pricing/seasons/:id', [controllers.PricingSeasons, 'update'])
      .as('pricingSeasons.update')
    router
      .delete('pricing/seasons/:id', [controllers.PricingSeasons, 'destroy'])
      .as('pricingSeasons.destroy')
  })
  .use([middleware.auth(), middleware.requireModulePlan({ feature: 'pricing' })])
