import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const NavigationController = () => import('#controllers/navigation_controller')

router
  .group(() => {
    router.get('navigation/logbook', [NavigationController, 'logbook']).as('navigation.logbook')
    router.get('navigation/fuel', [NavigationController, 'fuel']).as('navigation.fuel')
    router
      .get('navigation/incidents', [NavigationController, 'incidents'])
      .as('navigation.incidents')
  })
  .use(middleware.auth())
